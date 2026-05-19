"""
LSTM Stock Prediction
Memprediksi kapan stock akan habis berdasarkan data historis pergerakan stok.
Menggunakan data dari MongoDB collection stock_movements.
"""

import sys
import json
import numpy as np
from datetime import datetime, timedelta

try:
    from pymongo import MongoClient
    import os
    from dotenv import load_dotenv
    
    # Load env
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    MONGODB_URI = os.getenv('MONGODB_URI')
    
    HAS_TENSORFLOW = False
    try:
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
        import tensorflow as tf
        tf.get_logger().setLevel('ERROR')
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense
        from sklearn.preprocessing import MinMaxScaler
        HAS_TENSORFLOW = True
    except ImportError:
        HAS_TENSORFLOW = False

except ImportError as e:
    print(json.dumps({"success": False, "message": f"Missing dependency: {str(e)}"}))
    sys.exit(1)


def get_daily_out_data(product_id, db):
    """Ambil data harian barang keluar untuk produk tertentu (30 hari terakhir)"""
    movements = list(db.stock_movements.find({
        "product": product_id if isinstance(product_id, object) else product_id,
        "type": "OUT"
    }).sort("createdAt", 1))
    
    if not movements:
        return []
    
    # Group by date
    daily_data = {}
    for m in movements:
        date_key = m["createdAt"].strftime("%Y-%m-%d")
        if date_key not in daily_data:
            daily_data[date_key] = 0
        daily_data[date_key] += m["qty"]
    
    # Fill missing dates with 0
    if daily_data:
        dates = sorted(daily_data.keys())
        start_date = datetime.strptime(dates[0], "%Y-%m-%d")
        end_date = datetime.now()
        
        filled_data = []
        current = start_date
        while current <= end_date:
            key = current.strftime("%Y-%m-%d")
            filled_data.append(daily_data.get(key, 0))
            current += timedelta(days=1)
        
        return filled_data
    
    return []


def predict_with_lstm(daily_data, current_stock):
    """Prediksi menggunakan LSTM berapa hari stock akan habis"""
    if len(daily_data) < 7:
        # Data terlalu sedikit, gunakan rata-rata sederhana
        avg_out = np.mean(daily_data) if daily_data else 0
        if avg_out <= 0:
            return {"days": 999, "method": "average", "avg_out": 0, "predicted_daily": []}
        days = int(current_stock / avg_out)
        return {"days": days, "method": "average", "avg_out": round(avg_out, 2), "predicted_daily": []}
    
    if not HAS_TENSORFLOW or len(daily_data) < 14:
        # Fallback ke moving average jika TensorFlow tidak tersedia atau data kurang
        window = min(7, len(daily_data))
        recent = daily_data[-window:]
        avg_out = np.mean(recent)
        if avg_out <= 0:
            return {"days": 999, "method": "moving_average", "avg_out": 0, "predicted_daily": []}
        days = int(current_stock / avg_out)
        return {"days": days, "method": "moving_average", "avg_out": round(avg_out, 2), "predicted_daily": []}
    
    # === LSTM Model ===
    data = np.array(daily_data).reshape(-1, 1)
    
    # Normalize
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    # Prepare sequences (lookback = 7 hari)
    lookback = min(7, len(scaled_data) - 1)
    X, y = [], []
    for i in range(lookback, len(scaled_data)):
        X.append(scaled_data[i - lookback:i, 0])
        y.append(scaled_data[i, 0])
    
    if len(X) < 3:
        avg_out = np.mean(daily_data[-7:])
        if avg_out <= 0:
            return {"days": 999, "method": "fallback", "avg_out": 0, "predicted_daily": []}
        days = int(current_stock / avg_out)
        return {"days": days, "method": "fallback", "avg_out": round(avg_out, 2), "predicted_daily": []}
    
    X = np.array(X)
    y = np.array(y)
    X = X.reshape(X.shape[0], X.shape[1], 1)
    
    # Build LSTM model
    model = Sequential([
        LSTM(50, activation='relu', input_shape=(lookback, 1), return_sequences=True),
        LSTM(30, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    
    # Train
    model.fit(X, y, epochs=50, batch_size=min(16, len(X)), verbose=0)
    
    # Predict future (sampai stock habis, max 90 hari)
    last_sequence = scaled_data[-lookback:].reshape(1, lookback, 1)
    remaining_stock = current_stock
    predicted_daily = []
    days = 0
    
    for _ in range(90):
        pred = model.predict(last_sequence, verbose=0)[0][0]
        pred_value = scaler.inverse_transform([[pred]])[0][0]
        pred_value = max(0, pred_value)  # Tidak boleh negatif
        
        predicted_daily.append(round(pred_value, 2))
        remaining_stock -= pred_value
        days += 1
        
        if remaining_stock <= 0:
            break
        
        # Update sequence
        new_seq = np.append(last_sequence[0][1:], [[pred]], axis=0)
        last_sequence = new_seq.reshape(1, lookback, 1)
    
    avg_predicted = np.mean(predicted_daily) if predicted_daily else 0
    
    return {
        "days": days,
        "method": "lstm",
        "avg_out": round(avg_predicted, 2),
        "predicted_daily": predicted_daily[:14]  # Return max 14 hari prediksi
    }


def main():
    try:
        # Connect to MongoDB
        client = MongoClient(MONGODB_URI)
        db = client.get_default_database()
        
        # Get all products
        products = list(db.product.find())
        
        results = []
        
        for product in products:
            product_id = product["_id"]
            daily_data = get_daily_out_data(product_id, db)
            
            current_stock = product.get("stock", 0)
            min_stock = product.get("minStock", 10)
            
            # Predict
            prediction = predict_with_lstm(daily_data, current_stock)
            
            # Determine status
            days = prediction["days"]
            if days <= 3:
                status = "CRITICAL"
            elif days <= 7:
                status = "RESTOCK"
            else:
                status = "SAFE"
            
            results.append({
                "productId": str(product_id),
                "product": product.get("name", ""),
                "sku": product.get("sku", ""),
                "category": product.get("category", ""),
                "stock": current_stock,
                "minStock": min_stock,
                "avgOut": prediction["avg_out"],
                "predictedDays": days,
                "predictedDaily": prediction["predicted_daily"],
                "method": prediction["method"],
                "status": status,
            })
        
        # Sort by days ascending (most critical first)
        results.sort(key=lambda x: x["predictedDays"])
        
        # Stats
        stats = {
            "safe": len([r for r in results if r["status"] == "SAFE"]),
            "restock": len([r for r in results if r["status"] == "RESTOCK"]),
            "critical": len([r for r in results if r["status"] == "CRITICAL"]),
            "method": "lstm" if HAS_TENSORFLOW else "moving_average",
        }
        
        output = {"success": True, "data": results, "stats": stats}
        print(json.dumps(output, default=str))
        
        client.close()
        
    except Exception as e:
        print(json.dumps({"success": False, "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
