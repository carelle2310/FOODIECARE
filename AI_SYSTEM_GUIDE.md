# Food Recognition AI System - Implementation Guide

## Overview

This document describes the complete implementation of an **AI-powered food recognition system** built into a Next.js 14 application. The system uses machine learning to identify foods from uploaded images and provides nutritional information.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 14 - App Router)            │
├─────────────────────────────────────────────────────────────────┤
│  Components:                                                     │
│  - UploadForm: Image capture/upload with preview                │
│  - ResultCard: Display AI predictions & nutrition               │
│  - NutritionGrid: Nutrition metrics visualization               │
└─────────────────┬───────────────────────────────────────────────┘
                  │ POST /api/predict (multipart/form-data)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend API Route (/app/api/predict)               │
├─────────────────────────────────────────────────────────────────┤
│  1. Receive image file from FormData                            │
│  2. Validate image (size, format)                               │
│  3. Preprocess image (resize, normalize)                        │
│  4. Load ML model (cached)                                      │
│  5. Run inference                                               │
│  6. Map predictions to food labels                              │
│  7. Load nutrition data (cached)                                │
│  8. Fetch nutrition info for predicted food                     │
│  9. Return JSON response                                        │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴──────────────┬─────────────────┐
        ▼                        ▼                 ▼
    ┌────────┐         ┌──────────────┐      ┌──────────────┐
    │ Model  │         │  Nutrition   │      │  Label       │
    │ Cache  │         │  CSV (cached)│      │  Mapper      │
    └────────┘         └──────────────┘      └──────────────┘
```

## File Structure

```
lib/
  backend/
    index.ts                 # Main export barrel
    types.ts                 # TypeScript type definitions
    imageProcessor.ts        # Image preprocessing & validation
    modelLoader.ts          # ML model loading & inference
    nutritionLoader.ts      # CSV parsing & caching
    labelMapper.ts          # Prediction → food name mapping

app/api/predict/
  route.ts                  # POST API endpoint

components/
  UploadForm.jsx            # Frontend image upload component
  ResultCard.jsx            # Results display component
  NutritionGrid.jsx         # Nutrition metrics grid

data/
  nutrition.csv             # Nutrition database
  food-101/                 # Optional food image dataset
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

Newly added packages:

- `sharp` - Image processing and resizing
- `csv-parse` - CSV file parsing

### 2. Prepare Nutrition Data

Ensure `nutrition.csv` exists in the project root with columns:

```
Food,Calories,Protein,Carbohydrates,Fat,Fiber,Sugar,Sodium,Serving Size
pizza,285,12,36,10,2,3,500,100g
burger,540,25,45,28,2,8,1000,150g
...
```

### 3. Prepare ML Model

Two model options:

#### Option A: Use MobileNet (Recommended - No setup needed)

The system automatically loads MobileNet V3 from TensorFlow.js CDN when no custom model is found. This works out-of-the-box for general food detection.

#### Option B: Use Custom Model

Place your TensorFlow.js model in `public/models/`:

```
public/
  models/
    model.json          # Model topology + weights
    model.weights.bin   # Binary weight data
```

To convert PyTorch models to TensorFlow.js:

```bash
# Install converter
pip install tensorflowjs

# Convert model
tensorflowjs_converter --input_format pytorch path/to/model.pth public/models/
```

### 4. Configure Food Labels

Edit `lib/backend/labelMapper.ts` to add your food classes:

```typescript
export const FOOD101_LABELS = [
  'pizza', 'burger', 'salad', ...
];
```

## API Documentation

### POST /api/predict

**Request:**

```
Content-Type: multipart/form-data

Body:
  image: <File>  # JPEG, PNG, WebP (min 50x50px)
```

**Response (Success - 200):**

```json
{
  "success": true,
  "data": {
    "food": "Pizza",
    "confidence": 0.92,
    "nutrition": {
      "calories": 285,
      "protein": 12,
      "carbs": 36,
      "fat": 10,
      "fiber": 2,
      "sugar": 3,
      "sodium": 500,
      "servingSize": "100g"
    },
    "topPredictions": [
      { "label": "Pizza", "confidence": 0.92 },
      { "label": "Focaccia", "confidence": 0.05 },
      { "label": "Flatbread", "confidence": 0.02 }
    ]
  },
  "statusCode": 200
}
```

**Response (Error - 400/500):**

```json
{
  "success": false,
  "error": "Image validation failed: Image too small",
  "statusCode": 400
}
```

## Feature Details

### Image Processing

- **Resize**: 224×224 (standard for most ML models)
- **Normalization**: ImageNet mean/std applied
  - Mean: [0.485, 0.456, 0.406]
  - Std: [0.229, 0.224, 0.225]
- **Format**: PNG (converted from uploaded format)
- **Validation**: Min 50×50px, formats: JPEG/PNG/WebP

### Model Inference

- **Framework**: TensorFlow.js (Node.js backend)
- **Fallback**: MobileNet V3 from CDN
- **Caching**: Model loaded once, reused on subsequent requests
- **Memory**: Tensors disposed after inference
- **Output**: Top-k predictions with confidence scores

### Data Caching

- **Nutrition Data**: Loaded once in memory, reused across requests
- **Model**: Singleton pattern with lazy loading
- **TTL**: None (persists for app lifetime)

For production, consider implementing TTL-based cache invalidation.

### Label Mapping

Supports:

- **Food-101**: 101 food classes
- **ImageNet**: 1000 general classes
- **Custom**: Add your own labels in `labelMapper.ts`

Fuzzy matching available for nutrition data lookup (handles minor naming variations).

## Error Handling

| Error                    | Status | Cause                    | Solution                 |
| ------------------------ | ------ | ------------------------ | ------------------------ |
| Image too small          | 400    | < 50×50px                | Upload larger image      |
| Invalid image format     | 400    | Corrupted file           | Try different format     |
| Model not found          | 503    | Missing `public/models/` | Use MobileNet fallback   |
| Food not in nutrition DB | 200    | No matching entry        | Return default nutrition |

## Performance Considerations

### Memory

- Model: ~50-150MB (depends on model size)
- CSV Cache: ~2-5MB (for 101 foods)
- Per-request peak: ~100-200MB (during inference)

### Speed

- Image processing: ~200-500ms
- Model inference: ~500-1500ms (first request slower due to model loading)
- Total request: ~1-2 seconds average

### Optimization Tips

1. Enable caching in nginx/reverse proxy
2. Use CDN for static model files
3. Implement database instead of CSV for large datasets
4. Add request batching for multiple images
5. Use model quantization for faster inference

## Frontend Integration

### Upload Component

The `UploadForm` component handles:

1. Camera capture or file upload
2. Image preview
3. Automatic prediction via `/api/predict`
4. Display of top predictions with confidence
5. Nutrition preview
6. Form submission to `/api/analyze`

### Result Display

The `ResultCard` component shows:

- Predicted food name
- Confidence score
- Top 3 predictions
- Nutrition metrics (calories, protein, carbs, fat, etc.)
- Optional additional info (fiber, sugar, sodium)
- Serving size

## Extending the System

### Add Custom Food Classes

1. Update model with new training data
2. Add labels to `lib/backend/labelMapper.ts`
3. Add nutrition entries to `nutrition.csv`

### Custom Model Training

Example PyTorch training pipeline:

```python
import torch
from torchvision import models, transforms
from tensorflow.js.converters import convert_model

# Train your model
model = models.resnet50(num_classes=101)
# ... training code ...

# Convert to TensorFlow.js
convert_model(model, 'public/models/')
```

### Integrate with Database

Replace CSV with database:

```typescript
// In nutritionLoader.ts
import db from "@/lib/db";

export async function loadNutritionData() {
  const nutrition = await db.nutrition.findAll();
  // Process and return...
}
```

### Add Dietary Restrictions

```typescript
// In predict route
const restrictions = formData.get("dietary");
const warnings = checkRestrictions(nutrition, restrictions);
```

## Troubleshooting

### Model loading fails

- Check `public/models/` directory exists
- Verify model.json is valid
- Ensure weights.bin is complete
- Try MobileNet fallback

### Nutrition data not found

- Check CSV formatting (UTF-8, proper delimiter)
- Verify column names match exactly
- Test normalization in `normalizeFoodName()`
- Check for special characters

### Slow inference

- Check model size (large models need more time)
- Verify GPU availability (if using CUDA)
- Monitor memory usage
- Enable profiling in debug mode

### Image preprocessing errors

- Ensure image isn't corrupted
- Check file permissions
- Verify sufficient disk space
- Test with known-good image

## Production Checklist

- [ ] Use custom model (not MobileNet CDN)
- [ ] Implement proper error logging
- [ ] Add request rate limiting
- [ ] Enable CORS only for trusted origins
- [ ] Set up monitoring/alerting
- [ ] Add timeout for long requests
- [ ] Implement request caching
- [ ] Set up database for nutrition data
- [ ] Add authentication if needed
- [ ] Document API contract
- [ ] Set up CI/CD pipeline
- [ ] Add comprehensive testing

## References

- [TensorFlow.js](https://www.tensorflow.org/js)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [Food-101 Dataset](https://data.vision.ee.ethz.ch/cvl/food-101/)
- [csv-parse Documentation](https://csv.js.org/parse/)

## License

This implementation follows the same license as the parent FoodieCare project.
