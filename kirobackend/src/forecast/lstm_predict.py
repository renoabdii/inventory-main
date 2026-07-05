"""
LSTM Stock Prediction
Memprediksi kapan stok akan habis berdasarkan data historis pergerakan stok.

Model utama menggunakan TensorFlow/Keras LSTM sederhana:
- input 7 hari histori barang keluar
- output prediksi barang keluar hari berikutnya
- prediksi dilakukan rekursif sampai estimasi stok habis

Jika data belum cukup atau TensorFlow tidak tersedia, sistem otomatis memakai
fallback moving average agar fitur tetap berjalan.
"""

import sys
import json
import os
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path

# Kurangi log TensorFlow agar stdout tetap JSON valid untuk backend Node.js.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
LSTM_MAX_PRODUCTS = int(os.getenv("FORECAST_LSTM_MAX_PRODUCTS", "20"))
LSTM_EPOCHS = int(os.getenv("FORECAST_LSTM_EPOCHS", "6"))
LSTM_FORECAST_HORIZON = int(os.getenv("FORECAST_LSTM_HORIZON", "30"))
SEQUENCE_LENGTH = int(os.getenv("FORECAST_LSTM_SEQUENCE_LENGTH", "7"))
MODEL_DIR = Path(os.getenv(
    "FORECAST_MODEL_DIR",
    Path(__file__).resolve().parent / "models"
))

try:
    from pymongo import MongoClient
    from dotenv import load_dotenv
    from bson import ObjectId
    
    # Load env
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    MONGODB_URI = os.getenv('MONGODB_URI')

except ImportError as e:
    print(json.dumps({"success": False, "message": f"Missing dependency: {str(e)}"}))
    sys.exit(1)


def get_daily_out_data(movements, thirty_days_ago):
    """Susun data harian dari movement produk yang sudah diambil sekaligus."""
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
    start_date = thirty_days_ago
    end_date = datetime.now()
    
    filled_data = []
    current = start_date
    while current <= end_date:
        key = current.strftime("%Y-%m-%d")
        filled_data.append(daily_data.get(key, 0))
        current += timedelta(days=1)

    return filled_data


def predict_with_moving_average(daily_data, current_stock):
    """Fallback prediksi sederhana jika LSTM belum bisa dipakai."""
    non_zero = [value for value in daily_data if value > 0]
    avg_out = np.mean(non_zero) if non_zero else 0

    if avg_out <= 0:
        return {"days": 999, "method": "moving_average", "avg_out": 0, "predicted_daily": []}

    days = int(np.ceil(current_stock / avg_out)) if current_stock > 0 else 0
    predicted_daily = [round(float(avg_out), 2)] * min(days, 14)

    return {
        "days": days,
        "method": "moving_average",
        "avg_out": round(float(avg_out), 2),
        "predicted_daily": predicted_daily
    }


def normalize_daily_data(daily_data):
    data = np.array(daily_data, dtype=float)

    min_value = float(np.min(data))
    max_value = float(np.max(data))
    scale_range = max_value - min_value

    if scale_range <= 0:
        return None

    scaled = (data - min_value) / scale_range

    return {
        "scaled": scaled,
        "min_value": min_value,
        "scale_range": scale_range,
    }


def train_lstm_model(lstm_candidates):
    """Train model dan kembalikan status eksplisit agar error tidak tersamarkan."""
    x_train = []
    y_train = []

    for item in lstm_candidates:
        normalized = normalize_daily_data(item["daily_data"])
        if not normalized:
            continue

        scaled = normalized["scaled"]
        for i in range(len(scaled) - SEQUENCE_LENGTH):
            x_train.append(scaled[i:i + SEQUENCE_LENGTH])
            y_train.append(scaled[i + SEQUENCE_LENGTH])

    if len(x_train) < 3:
        return None, "insufficient_data", None

    x_train = np.array(x_train).reshape((len(x_train), SEQUENCE_LENGTH, 1))
    y_train = np.array(y_train)

    try:
        import tensorflow as tf
        from tensorflow.keras.layers import Dense, LSTM
        from tensorflow.keras.models import Sequential

        tf.random.set_seed(42)

        model = Sequential([
            LSTM(8, activation="tanh", input_shape=(SEQUENCE_LENGTH, 1)),
            Dense(1)
        ])
        model.compile(optimizer="adam", loss="mse")
        model.fit(x_train, y_train, epochs=LSTM_EPOCHS, batch_size=4, verbose=0)
        return model, "completed", None
    except ModuleNotFoundError as error:
        return None, "unavailable", str(error)
    except ImportError as error:
        return None, "unavailable", str(error)
    except Exception as error:
        return None, "failed", str(error)


def save_lstm_model(model, user_id):
    """Simpan model hasil training dan kembalikan path relatif untuk metadata."""
    if not model:
        return None, None

    try:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        safe_user_id = "".join(ch for ch in str(user_id) if ch.isalnum() or ch in ("-", "_"))
        model_path = MODEL_DIR / f"forecast-model-{safe_user_id}.keras"
        model.save(model_path)

        try:
            return str(model_path.relative_to(Path(__file__).resolve().parents[2])), None
        except ValueError:
            return str(model_path), None
    except Exception as error:
        return None, str(error)


def predict_with_trained_lstm(item, model):
    """Prediksi satu produk memakai model LSTM gabungan yang sudah dilatih."""
    daily_data = item["daily_data"]
    current_stock = item["current_stock"]

    if not model or len(daily_data) < SEQUENCE_LENGTH + 1 or sum(daily_data) <= 0:
        return predict_with_moving_average(daily_data, current_stock)

    normalized = normalize_daily_data(daily_data)
    if not normalized:
        return predict_with_moving_average(daily_data, current_stock)

    scaled = normalized["scaled"]
    min_value = normalized["min_value"]
    scale_range = normalized["scale_range"]

    remaining_stock = current_stock
    predicted_daily = []
    days = 0
    sequence = scaled[-SEQUENCE_LENGTH:].reshape((1, SEQUENCE_LENGTH, 1))

    for i in range(LSTM_FORECAST_HORIZON):
        scaled_prediction = float(model(sequence, training=False).numpy()[0][0])
        scaled_prediction = max(0.0, min(1.0, scaled_prediction))
        prediction = scaled_prediction * scale_range + min_value
        prediction = max(0.0, float(prediction))

        predicted_daily.append(round(prediction, 2))
        remaining_stock -= prediction
        days += 1

        if remaining_stock <= 0:
            break

        next_scaled = np.array([[[scaled_prediction]]])
        sequence = np.concatenate((sequence[:, 1:, :], next_scaled), axis=1)

    avg_predicted = np.mean(predicted_daily) if predicted_daily else 0

    if avg_predicted <= 0:
        return predict_with_moving_average(daily_data, current_stock)

    if remaining_stock > 0:
        days = int(np.ceil(current_stock / avg_predicted)) if current_stock > 0 else 0

    return {
        "days": days,
        "method": "lstm",
        "avg_out": round(avg_predicted, 2),
        "predicted_daily": predicted_daily[:14]
    }


def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("userId is required")

        user_id = sys.argv[1]

        # Connect to MongoDB
        client = MongoClient(MONGODB_URI)
        db = client.get_default_database()
        
        # Get products for authenticated admin/cashier owner only
        products = list(db.product.find({"userId": ObjectId(str(user_id))}))
        thirty_days_ago = datetime.now() - timedelta(days=30)
        product_ids = [product["_id"] for product in products]
        movements_by_product = {}

        if product_ids:
            movements = db.stock_movements.find({
                "userId": ObjectId(str(user_id)),
                "product": {"$in": product_ids},
                "type": "OUT",
                "createdAt": {"$gte": thirty_days_ago}
            }).sort("createdAt", 1)

            for movement in movements:
                product_key = str(movement["product"])
                movements_by_product.setdefault(product_key, []).append(movement)
        
        prepared_products = []

        for product in products:
            product_id = product["_id"]
            daily_data = get_daily_out_data(
                movements_by_product.get(str(product_id), []),
                thirty_days_ago
            )
            
            current_stock = product.get("stock", 0)
            min_stock = product.get("minStock", 10)

            baseline_prediction = predict_with_moving_average(daily_data, current_stock)
            prepared_products.append({
                "product": product,
                "product_id": product_id,
                "daily_data": daily_data,
                "current_stock": current_stock,
                "min_stock": min_stock,
                "baseline_prediction": baseline_prediction,
            })

        lstm_candidates = sorted(
            [
                item for item in prepared_products
                if sum(item["daily_data"]) > 0 and item["baseline_prediction"]["days"] < 999
            ],
            key=lambda item: item["baseline_prediction"]["days"]
        )[:LSTM_MAX_PRODUCTS]
        lstm_candidate_ids = {str(item["product_id"]) for item in lstm_candidates}
        lstm_model, lstm_status, lstm_error = train_lstm_model(lstm_candidates)
        model_path, model_save_error = save_lstm_model(lstm_model, user_id) if lstm_status == "completed" else (None, None)

        results = []

        for item in prepared_products:
            product = item["product"]
            product_id = item["product_id"]
            current_stock = item["current_stock"]
            min_stock = item["min_stock"]

            # LSTM dijalankan hanya untuk produk prioritas agar forecast tetap responsif.
            if str(product_id) in lstm_candidate_ids and lstm_model:
                prediction = predict_with_trained_lstm(item, lstm_model)
            else:
                prediction = item["baseline_prediction"]

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
        display_lstm_error = None if lstm_status == "unavailable" else lstm_error
        display_model_error = model_save_error or display_lstm_error

        stats = {
            "safe": len([r for r in results if r["status"] == "SAFE"]),
            "restock": len([r for r in results if r["status"] == "RESTOCK"]),
            "critical": len([r for r in results if r["status"] == "CRITICAL"]),
            "method": "lstm" if any(r["method"] == "lstm" for r in results) else "moving_average",
            "lstmStatus": lstm_status,
            "lstmError": display_lstm_error,
            "model": {
                "status": "ready" if model_path else ("failed" if lstm_status == "failed" or model_save_error else "insufficient_data"),
                "modelPath": model_path,
                "trainedAt": datetime.now().isoformat() if model_path else None,
                "dataStartDate": thirty_days_ago.isoformat(),
                "dataEndDate": datetime.now().isoformat(),
                "epochs": LSTM_EPOCHS,
                "sequenceLength": SEQUENCE_LENGTH,
                "horizon": LSTM_FORECAST_HORIZON,
                "maxProducts": LSTM_MAX_PRODUCTS,
                "productCount": len(products),
                "productsTrained": len(lstm_candidates) if model_path else 0,
                "error": display_model_error,
            },
        }
        
        output = {"success": True, "data": results, "stats": stats}
        print(json.dumps(output, default=str))
        
        client.close()
        
    except Exception as e:
        print(json.dumps({"success": False, "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
