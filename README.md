# Portfolio 3D Setup Instructions

## 1. Get a Robot Model
You need a 3D model file in `.glb` or `.gltf` format.
- **Recommended**: Use a model from [Sketchfab](https://sketchfab.com/) or [Mixamo](https://www.mixamo.com/).
- **Requirements**: One single file (`.glb` is best).
- **Placement**: Save the file as `robot.glb` inside the `assets/` folder.
    - Path: `C:\Portfolio\assets\robot.glb`

## 2. Check Bone Names
If the robot's head doesn't move when you move your mouse:
1. Open the browser console (F12).
2. Look for the logs or errors.
3. You might need to change the bone name in `main.js`.
   - Find this line: `state.head = state.robot.getObjectByName('Head') ...`
   - Change 'Head' to whatever your model uses (e.g., 'Neck', 'mixamorigHead', 'spine_03').

## 3. Run Locally
You need a local server to load 3D assets due to browser security (CORS).
If you have Python installed:
```powershell
cd C:\Portfolio
python -m http.server
```
Then open `http://localhost:8000` in your browser.

## 4. Customization
- **Sensitivity**: Adjust `headRotationLimit` in `main.js`.
- **Colors**: Change CSS variables in `style.css`.
- **Lighting**: Tweak `setupLighting()` in `main.js`.
