# Models Configuration

Đây là file cấu hình cho tất cả các models và shapes trong ứng dụng 3D EdTech Builder.

## Cấu trúc File

File `models-config.json` chứa 4 loại đối tượng chính:

### 1. Shapes (Hình học cơ bản)
```json
{
  "label": "Tên hiển thị",
  "icon": "Tên icon (Box, Circle, Triangle, Layers, User)",
  "subType": "Loại hình học (box, sphere, cone, torus)"
}
```

### 2. Human Models (Mô hình người)
```json
{
  "label": "Tên hiển thị",
  "icon": "User",
  "url": "Đường dẫn đến file .glb"
}
```

### 3. Facility Models (Mô hình thiết bị y tế)
```json
{
  "label": "Tên hiển thị",
  "icon": "Box hoặc icon khác",
  "url": "Đường dẫn đến file .glb"
}
```

### 4. Room Models (Mô hình phòng)
```json
{
  "label": "Tên hiển thị",
  "icon": "Layers hoặc icon khác",
  "url": "Đường dẫn đến file .glb"
}
```

## Icons có sẵn

- `Box` - Icon hình hộp
- `Circle` - Icon hình tròn
- `Triangle` - Icon hình tam giác
- `Layers` - Icon lớp/layer
- `User` - Icon người dùng

## Cách thêm Model mới

1. Thêm file .glb vào thư mục `public/models/[category]/`
2. Mở file `models-config.json`
3. Thêm entry mới vào mảng tương ứng:

```json
{
  "label": "Tên Model",
  "icon": "Box",
  "url": "/models/[category]/[filename].glb"
}
```

4. Lưu file - ứng dụng sẽ tự động reload

## Load từ nguồn khác

Bạn có thể load config từ API hoặc nguồn khác bằng cách thay đổi URL trong `Sidebar.tsx`:

```typescript
const response = await fetch('https://your-api.com/models-config');
```

## Ví dụ thêm Model mới

```json
{
  "facilityModels": [
    {
      "label": "X-Ray Machine",
      "icon": "Box",
      "url": "/models/Facility/xray-machine.glb"
    }
  ]
}
```
