from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
from database import SessionLocal, Ticker

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TickerCreate(BaseModel):
    symbol: str


def get_quote(symbol: str):
    """Fetch current price and daily change for a symbol."""
    try:
        stock = yf.Ticker(symbol)
        info = stock.info
        price = info.get("regularMarketPrice") or info.get("currentPrice")
        prev_close = info.get("regularMarketPreviousClose") or info.get("previousClose")
        if price and prev_close:
            change_pct = ((price - prev_close) / prev_close) * 100
            return {"price": round(price, 2), "change_pct": round(change_pct, 2)}
    except:
        pass
    return {"price": None, "change_pct": None}


@app.get("/watchlist")
def get_watchlist():
    db = SessionLocal()
    tickers = db.query(Ticker).all()
    db.close()
    
    result = []
    for t in tickers:
        quote = get_quote(t.symbol)
        result.append({
            "id": t.id,
            "symbol": t.symbol.upper(),
            "price": quote["price"],
            "change_pct": quote["change_pct"]
        })
    return {"watchlist": result}


@app.post("/watchlist")
def add_ticker(ticker: TickerCreate):
    db = SessionLocal()
    symbol = ticker.symbol.upper().strip()
    
    # Check if already exists
    existing = db.query(Ticker).filter(Ticker.symbol == symbol).first()
    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Ticker already in watchlist")
    
    # Validate ticker exists
    quote = get_quote(symbol)
    if quote["price"] is None:
        db.close()
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")
    
    new_ticker = Ticker(symbol=symbol)
    db.add(new_ticker)
    db.commit()
    db.refresh(new_ticker)
    db.close()
    
    return {"id": new_ticker.id, "symbol": symbol, **quote}


@app.delete("/watchlist/{ticker_id}")
def delete_ticker(ticker_id: int):
    db = SessionLocal()
    ticker = db.query(Ticker).filter(Ticker.id == ticker_id).first()
    if not ticker:
        db.close()
        raise HTTPException(status_code=404, detail="Ticker not found")
    db.delete(ticker)
    db.commit()
    db.close()
    return {"message": "Ticker removed"}