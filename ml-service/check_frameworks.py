import sys
print('Python:', sys.version)

packages = {
    'torch': 'PyTorch',
    'tensorflow': 'TensorFlow',
    'keras': 'Keras',
    'onnxruntime': 'ONNX Runtime',
    'PIL': 'Pillow',
    'cv2': 'OpenCV'
}

for module, name in packages.items():
    try:
        pkg = __import__(module)
        version = getattr(pkg, '__version__', 'unknown')
        print(f'✓ {name}: {version}')
    except ImportError:
        print(f'✗ {name}: NOT INSTALLED')
