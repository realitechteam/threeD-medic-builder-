# Multiple Mode Preview Controls

## Tổng quan

Viewer hiện hỗ trợ 3 chế độ điều khiển khác nhau, tự động phát hiện và điều chỉnh UI phù hợp với từng thiết bị:

## 1. **Desktop Mode** (Máy tính để bàn/Laptop)

### Điều khiển:
- **Di chuyển**: Phím `W` `A` `S` `D`
- **Nhìn xung quanh**: Di chuyển chuột (khi cursor đã bị khóa)
- **Tương tác**: Click chuột trái
- **Mở khóa cursor**: Nhấn phím `ESC`

### Đặc điểm:
- Sử dụng `PointerLockControls` để khóa con trỏ chuột
- Hiển thị crosshair (dấu ngắm) ở giữa màn hình
- Hiển thị hướng dẫn "Click anywhere to lock your cursor" khi bắt đầu
- Mode indicator hiển thị: 🖥️ Desktop Mode

## 2. **Mobile/Touch Mode** (Điện thoại/Tablet)

### Điều khiển:
- **Di chuyển**: Sử dụng joystick ảo màu xanh ở góc dưới bên trái
- **Nhìn xung quanh**: Sử dụng joystick ảo màu tím ở góc dưới bên phải
- **Tương tác**: Chạm vào đối tượng

### Đặc điểm:
- Tự động phát hiện thiết bị cảm ứng qua `'ontouchstart' in window || navigator.maxTouchPoints > 0`
- Hiển thị **2 joysticks ảo**:
  - **Trái (Xanh)**: Di chuyển (WASD equivalent)
  - **Phải (Tím)**: Xoay camera (Mouse look equivalent)
- Không hiển thị PointerLockControls
- Không hiển thị crosshair
- Mode indicator hiển thị: 📱 Touch Mode

### Joysticks:
- **Movement Joystick (Trái)**:
  - Vị trí: Góc dưới bên trái
  - Màu: Xanh dương
  - Chức năng: Di chuyển tiến/lùi/trái/phải
- **Look Joystick (Phải)**:
  - Vị trí: Góc dưới bên phải
  - Màu: Tím
  - Chức năng: Xoay camera lên/xuống/trái/phải
- Kích thước: 96x96px (w-24 h-24)
- Phạm vi di chuyển: 40px từ tâm
- Tự động reset về tâm khi thả tay

## 3. **VR Mode** (Kính thực tế ảo)

### Điều khiển:
- **Di chuyển**: Sử dụng controllers VR
- **Nhìn xung quanh**: Xoay đầu trong VR
- **Tương tác**: Sử dụng VR controllers

### Đặc điểm:
- Hiển thị nút "Enter VR" để vào chế độ VR
- Sử dụng WebXR API qua `@react-three/xr`
- Tự động vô hiệu hóa camera controls khi `isPresenting === true`
- Hiển thị VR controllers trong scene

### Kích hoạt VR:
1. Nhấn nút "Enter VR" ở góc trên màn hình
2. Đeo kính VR
3. Sử dụng controllers để tương tác

**Lưu ý**: Project sử dụng `@react-three/xr` v5.7.1 (stable version). Version 6.x có breaking changes lớn và yêu cầu refactor code.

## Cấu trúc Code

### Components chính:

1. **Joystick Component**
   - Xử lý touch/mouse events
   - Tính toán vector di chuyển (-1 đến 1)
   - Hiển thị UI joystick với animation

2. **Player Component** (Unified Controller)
   - Nhận input từ keyboard (desktop)
   - Nhận input từ joystick (mobile)
   - Tự động vô hiệu hóa khi VR mode (`isPresenting`)
   - Kết hợp cả hai nguồn input

3. **Canvas với XR Wrapper**
   ```tsx
   <Canvas>
     <XR>
       {/* Scene content */}
     </XR>
   </Canvas>
   ```

4. **Conditional Rendering**
   - PointerLockControls: Chỉ render khi `!isMobile`
   - Joystick: Chỉ render khi `isMobile && !completed`
   - Crosshair: Chỉ render khi `!isMobile && isLocked && !completed`
   - Start Instructions: Chỉ render khi `!isLocked && !completed && !isMobile`

## State Management

```tsx
const [isMobile, setIsMobile] = useState(false);
const [joystickVal, setJoystickVal] = useState({ x: 0, y: 0 });
const [isLocked, setIsLocked] = useState(false);
```

## Mode Detection

```tsx
useEffect(() => {
  setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
}, []);
```

## UI Indicators

### Mode Status Badge
- Vị trí: Góc trên bên phải (top-20 right-6)
- Desktop: Màu xanh dương với icon Monitor
- Mobile: Màu tím với icon Smartphone
- Hiển thị liên tục trong suốt session

## Best Practices

1. **Mobile Detection**: Chạy một lần khi component mount
2. **Input Priority**: Keyboard input ưu tiên hơn joystick (cho desktop testing)
3. **VR Camera**: Tự động skip camera updates khi trong VR mode
4. **Performance**: Joystick sử dụng useCallback để tối ưu re-renders

## Tương thích

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Oculus Browser (VR)
- ✅ Meta Quest Browser (VR)
