# FoodieCare - AI System Setup Guide

Complete step-by-step setup for the AI-powered food recognition feature.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Model Setup](#model-setup)
3. [Running the Application](#running-the-application)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Python 3.8+ (only for model conversion, optional)

### Install Dependencies

```bash
npm install
```

This installs:

- `sharp` - Image processing
- `csv-parse` - CSV parsing
- `@tensorflow/tfjs` - ML model runtime
- All other existing dependencies

### Verify Nutrition Data

```bash
# Check that nutrition.csv exists in project root
ls nutrition.csv

# Preview first few lines
head -n 3 nutrition.csv
```

Expected format:

```
Food,Calories,Protein,Carbohydrates,Fat,Fiber,Sugar,Sodium,Serving Size
pizza,285,12,36,10,2,3,500,100g
burger,540,25,45,28,2,8,1000,150g
```

## Model Setup

### Option 1: Automatic MobileNet (Recommended for Development)

**Pros:**

- No setup required
- Works immediately
- Good for general food detection
- Lightweight (~50MB)

**Cons:**

- Less specialized than custom trained model
- Accuracy may vary for specific food types

**Setup:**

- No action needed! The system automatically loads MobileNet from TensorFlow.js CDN.
- First request may take 5-10 seconds to download and load the model.

### Option 2: Custom TensorFlow.js Model (Production)

#### 2a. Using Pretrained PyTorch Model

**Step 1: Install converter**

```bash
pip install tensorflowjs
```

**Step 2: Prepare your PyTorch model**

```python
# Ensure model is on CPU and in eval mode
import torch
model = torch.load('path/to/your/model.pth')
model.eval()
model.cpu()

# Export to ONNX (intermediate format)
torch.onnx.export(
    model,
    torch.randn(1, 3, 224, 224),
    'model.onnx',
    input_names=['image'],
    output_names=['output'],
    opset_version=12
)
```

**Step 3: Convert to TensorFlow.js**

```bash
tensorflowjs_converter \
  --input_format tfjs \
  --output_format tfjs \
  path/to/model.pth \
  public/models/
```

Or convert from ONNX:

```bash
tensorflowjs_converter \
  --input_format onnx \
  --output_format tfjs \
  model.onnx \
  public/models/
```

**Step 4: Verify output**

```bash
ls public/models/
# Should see: model.json, model.weights.bin
```

#### 2b. Using Keras Model

```bash
# Convert directly from Keras
tensorflowjs_converter \
  --input_format keras \
  path/to/model.h5 \
  public/models/
```

#### 2c. Create Model Directory

```bash
mkdir -p public/models
# Place model.json and model.weights.bin here
```

### Option 3: TensorFlow SavedModel

If you have a TensorFlow SavedModel format:

```bash
tensorflowjs_converter \
  --input_format tf_saved_model \
  path/to/saved_model \
  public/models/
```

## Configuring Food Labels

Edit `lib/backend/labelMapper.ts` to match your model's output classes:

```typescript
export const FOOD101_LABELS = [
  "aloo_gobi", // Index 0
  "apple_pie", // Index 1
  "baby_back_ribs", // Index 2
  // ... add all your classes in order
];
```

**Important:** The order must match your model's output layer (usually alphabetical for Food-101).

## Running the Application

### Development Mode

```bash
npm run dev
```

The app will start at `http://localhost:3000`

**Check:**

- Home page loads
- Camera/upload components visible
- Network tab shows model loading on first prediction

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Create `.env.local` (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Edit as needed:

```
LOG_LEVEL=info
ENABLE_FUZZY_MATCHING=true
CACHE_MODEL=true
```

## Testing

### Manual Testing

1. **Open http://localhost:3000**
2. **Test Camera:**
   - Click "📷 Camera"
   - Allow camera permission
   - Take a photo of food
   - Wait for prediction
   - Check results

3. **Test Upload:**
   - Click "📁 Upload File"
   - Select an image
   - Check prediction appears
   - Verify nutrition data shown

4. **Test Different Foods:**
   - Pizza, burger, salad, pasta, etc.
   - Check accuracy and confidence
   - Verify nutrition data matches CSV

### API Testing with cURL

```bash
# Basic test
curl -X POST http://localhost:3000/api/predict \
  -F "image=@path/to/image.jpg"

# Example response:
{
  "success": true,
  "data": {
    "food": "Pizza",
    "confidence": 0.92,
    "nutrition": { ... },
    "topPredictions": [ ... ]
  }
}
```

### API Testing with Postman

1. Create new POST request
2. URL: `http://localhost:3000/api/predict`
3. Body → form-data
4. Add key `image` with type `File`
5. Select image file
6. Send
7. View response

### Client-Side Testing

```javascript
// In browser console
const formData = new FormData();
const input = document.querySelector('input[type="file"]');
formData.append("image", input.files[0]);

fetch("/api/predict", { method: "POST", body: formData })
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

## Troubleshooting

### Issue: "Model not found" Error

**Solution:**

1. Check `public/models/` directory exists
2. Verify `model.json` is present
3. Verify `model.weights.bin` is present
4. Check file permissions: `ls -la public/models/`
5. Parser should automatically use MobileNet fallback

### Issue: Slow Model Loading

**Cause:** First request downloads 50MB model

**Solution:**

1. Wait 5-10 seconds on first request
2. Subsequent requests use cache (instant)
3. For production, pre-download model to server

### Issue: "Nutrition data not found"

**Causes:**

1. `nutrition.csv` missing or invalid
2. Food name doesn't match CSV entries
3. CSV column headers incorrect

**Solutions:**

```bash
# Check file exists
ls /path/to/nutrition.csv

# Check format
head nutrition.csv

# Verify columns
grep -o "^[^,]*" nutrition.csv | head -n 1

# Test matching
node -e "console.log('pizza_'.replace(/[^a-z0-9_]/g, ''))"
```

### Issue: Image Validation Fails

**Common Causes:**

- Image too small (< 50×50 px)
- Unsupported format
- Corrupted file
- File too large (> 10MB)

**Solutions:**

```bash
# Get image dimensions
identify image.jpg  # ImageMagick
file image.jpg
du -h image.jpg

# Resize if too small
ffmpeg -i small.jpg -vf scale=224:224 resized.jpg

# Convert format if needed
ffmpeg -i image.webp image.jpg
```

### Issue: Wrong Food Predictions

**Likely Causes:**

1. Model trained on different classes
2. Image quality too poor
3. Unusual angle/lighting
4. Label mapping incorrect

**Solutions:**

1. Check `labelMapper.ts` classes match model output
2. Test with clear, well-lit food photos
3. Consider retraining model or using different model
4. Verify CSV food names match label predictions

### Issue: Nutrition Data Doesn't Match Food

**Solutions:**

1. Check fuzzy matching in `nutritionLoader.ts`
2. Add more food variations to CSV
3. Test name normalization:
   ```typescript
   // In console
   import { normalizeFoodName } from "@/lib/backend/nutritionLoader";
   normalizeFoodName("Pizza Margherita"); // 'pizza_margherita'
   ```
4. Manually verify CSV entries

### Issue: Memory Leaks or Out of Memory

**Solutions:**

1. Check tensor disposal in `modelLoader.ts`
2. Enable debug logging:
   ```
   LOG_LEVEL=debug
   ```
3. Monitor memory:
   ```javascript
   // In API route
   console.log(process.memoryUsage());
   ```
4. Limit concurrent requests (add rate limiting)

### Issue: CORS Errors

**Check:**

1. Requests from `http://localhost:3000` (should work in dev)
2. For other origins, check API route `OPTIONS` handler
3. Add CORS headers if needed

### Issue: Performance is Slow

**Optimization checklist:**

- [ ] Model cached? (should be instant after first load)
- [ ] Nutrition data cached? (should use cache, not reload CSV)
- [ ] Using production build? (`npm run build`)
- [ ] Image size reasonable? (should be < 5MB)
- [ ] Server CPU usage high? (check model complexity)

## Advanced Configuration

### Change Model Path

Edit `lib/backend/config.ts`:

```typescript
export const MODEL_CONFIG = {
  CUSTOM_MODEL_PATH: "public/models/my-custom-model.json",
  // ... other config
};
```

### Enable Request Logging

```typescript
// In route.ts
import { logger } from "@/lib/backend/utils";

logger.info("Prediction request received", {
  fileName: imageFile.name,
  fileSize: imageFile.size,
});
```

### Add Custom Metrics

```typescript
import { PerformanceTimer } from "@/lib/backend/utils";

const timer = new PerformanceTimer("prediction");
// ... do work ...
const duration = timer.end(); // logs to console
```

## Next Steps

After successful setup:

1. **Data Collection:** Gather more food images for better accuracy
2. **Model Training:** Train custom model on your specific foods
3. **Database Integration:** Switch from CSV to database for scalability
4. **Deployment:** Deploy to Vercel, AWS, or other Node.js host
5. **Mobile:** Build mobile app with same backend
6. **Analytics:** Track prediction accuracy and user behavior

## Support

For issues:

1. Check this troubleshooting guide
2. Review logs: `LOG_LEVEL=debug npm run dev`
3. Check browser console for frontend errors
4. Review server console for backend errors
5. Test API directly with cURL/Postman

## Additional Resources

- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [Sharp API Reference](https://sharp.pixelplumbing.com/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Food-101 Dataset](https://data.vision.ee.ethz.ch/cvl/food-101/)
