#include <gl2_vert>
#define SHADER_NAME MARKER
#define RAD 0.0174532925

#ifdef HAS_ALTITUDE
    attribute vec2 aPosition;
    attribute float aAltitude;
#else
    attribute vec3 aPosition;
#endif

attribute vec2 aShape;
attribute vec3 aTexCoord;
//uint8
#ifdef ENABLE_COLLISION
    attribute float aOpacity;
#endif

#ifdef HAS_OPACITY
    attribute float aColorOpacity;
#endif

#ifdef HAS_TEXT_SIZE
    attribute float aTextSize;
#else
    uniform float textSize;
#endif

#ifdef HAS_MARKER_WIDTH
    attribute float aMarkerWidth;
#else
    uniform float markerWidth;
#endif
#ifdef HAS_MARKER_HEIGHT
    attribute float aMarkerHeight;
#else
    uniform float markerHeight;
#endif
#ifdef HAS_MARKER_DX
    attribute float aMarkerDx;
#else
    uniform float markerDx;
#endif
#ifdef HAS_MARKER_DY
    attribute float aMarkerDy;
#else
    uniform float markerDy;
#endif
#if defined(HAS_PITCH_ALIGN)
    attribute float aPitchAlign;
#else
    uniform float pitchWithMap;
#endif

#if defined(HAS_ROTATION_ALIGN)
    attribute float aRotationAlign;
#else
    uniform float rotateWithMap;
#endif

uniform float flipY;
#ifdef HAS_ROTATION
    attribute float aRotation;
#else
    uniform float markerRotation;
#endif


#ifdef HAS_PAD_OFFSET
attribute float aPadOffsetX;
attribute float aPadOffsetY;
#endif

uniform float cameraToCenterDistance;
uniform mat4 positionMatrix;
uniform mat4 projViewModelMatrix;
uniform float textPerspectiveRatio;
uniform float markerPerspectiveRatio;

uniform float glyphSize;
uniform vec2 iconSize;
uniform vec2 iconTexSize;
uniform vec2 textTexSize;
uniform vec2 canvasSize;
uniform float mapPitch;
uniform float mapRotation;

uniform float zoomScale;
 //EXTENT / tileSize
uniform float tileRatio;

uniform float layerScale;
uniform float isRenderingTerrain;

#include <vt_position_vert>

#ifndef PICKING_MODE
    varying vec2 vTexCoord;
    varying float vOpacity;
    varying float vGammaScale;
    varying float vSize;

    #ifdef HAS_TEXT_FILL
        attribute vec4 aTextFill;
        varying vec4 vTextFill;
    #endif

    #ifdef HAS_TEXT_HALO_FILL
        attribute vec4 aTextHaloFill;
        varying vec4 vTextHaloFill;
    #endif

    #ifdef HAS_TEXT_HALO_RADIUS
        attribute float aTextHaloRadius;
        varying float vTextHaloRadius;
    #endif
    #ifdef HAS_TEXT_HALO_OPACITY
        attribute float aTextHaloOpacity;
        varying float vTextHaloOpacity;
    #endif

    #include <highlight_vert>
#else
    #include <fbo_picking_vert>
#endif

void main() {
    vec3 position = unpackVTPosition();
    #ifdef HAS_TEXT_SIZE
        float myTextSize = aTextSize * layerScale;
    #else
        float myTextSize = textSize * layerScale;
    #endif
    #ifdef HAS_MARKER_WIDTH
        float myMarkerWidth = aMarkerWidth;
    #else
        float myMarkerWidth = markerWidth;
    #endif
    #ifdef HAS_MARKER_HEIGHT
        float myMarkerHeight = aMarkerHeight;
    #else
        float myMarkerHeight = markerHeight;
    #endif
    #ifdef HAS_MARKER_DX
        float myMarkerDx = aMarkerDx;
    #else
        float myMarkerDx = markerDx;
    #endif
    #ifdef HAS_MARKER_DY
        float myMarkerDy = aMarkerDy;
    #else
        float myMarkerDy = markerDy;
    #endif
    #if defined(HAS_PITCH_ALIGN)
        float isPitchWithMap = aPitchAlign;
    #else
        float isPitchWithMap = pitchWithMap;
    #endif
    #if defined(HAS_ROTATION_ALIGN)
        float isRotateWithMap = aRotationAlign;
    #else
        float isRotateWithMap = rotateWithMap;
    #endif
    gl_Position = projViewModelMatrix * positionMatrix * vec4(position, 1.0);
    float projDistance = gl_Position.w;

    float perspectiveRatio;
    if (isRenderingTerrain == 1.0 && isPitchWithMap == 1.0) {
        perspectiveRatio = 1.0;
    } else {
        float distanceRatio = (1.0 - cameraToCenterDistance / projDistance) * markerPerspectiveRatio;
        //通过distance动态调整大小
        perspectiveRatio = clamp(
            0.5 + 0.5 * (1.0 - distanceRatio),
            0.0, // Prevents oversized near-field symbols in pitched/overzoomed tiles
            4.0);
    }
    #ifdef HAS_ROTATION
        float rotation = -aRotation / 9362.0 - mapRotation * isRotateWithMap;
    #else
        float rotation = -markerRotation - mapRotation * isRotateWithMap;
    #endif

    if (isPitchWithMap == 1.0) {
        // rotation += mapRotation;
        #ifdef REVERSE_MAP_ROTATION_ON_PITCH
            // PointLayer 的  mapRotation 计算方式
            rotation += mapRotation;
        #else
            rotation -= mapRotation;
        #endif
    }
    float angleSin = sin(rotation);
    float angleCos = cos(rotation);

    mat2 shapeMatrix = mat2(angleCos, -1.0 * angleSin, angleSin, angleCos);
    vec2 shape = (aShape / 10.0);
    if (isPitchWithMap == 1.0 && flipY == 0.0) {
        shape *= vec2(1.0, -1.0);
    }

    float isText = aTexCoord.z;
    #ifdef HAS_PAD_OFFSET
        // aPadOffsetX - 1.0 是为了解决1个像素偏移的问题, fuzhenn/maptalks-designer#638
        shape = (shape / iconSize * vec2(myMarkerWidth, myMarkerHeight) + vec2(aPadOffsetX - 1.0, aPadOffsetY)) * layerScale;
    #else
        if (isText == 1.0) {
            shape = shape / glyphSize * myTextSize;
        } else {
            shape = shape / iconSize * vec2(myMarkerWidth, myMarkerHeight) * layerScale;
        }

    #endif

    shape = shapeMatrix * shape;

    float cameraScale;
    if (isRenderingTerrain == 1.0) {
        cameraScale = 1.0;
    } else {
        cameraScale = projDistance / cameraToCenterDistance;
    }

    if (isPitchWithMap == 0.0) {
        vec2 offset = shape * 2.0 / canvasSize;
        gl_Position.xy += offset * perspectiveRatio * projDistance;
    } else if (isText == 1.0) {
        float offsetScale;
        if (isRenderingTerrain == 1.0) {
            offsetScale = tileRatio / zoomScale;
        } else {
            offsetScale = tileRatio / zoomScale * cameraScale * perspectiveRatio;
        }
        vec2 offset = shape;
        //乘以cameraScale可以抵消相机近大远小的透视效果
        gl_Position = projViewModelMatrix * positionMatrix * vec4(position + vec3(offset, 0.0) * offsetScale, 1.0);
    } else {
        vec2 offset = shape;
        //乘以cameraScale可以抵消相机近大远小的透视效果
        gl_Position = projViewModelMatrix * positionMatrix * vec4(position + vec3(offset, 0.0) * tileRatio / zoomScale * cameraScale * perspectiveRatio, 1.0);
    }

    gl_Position.xy += vec2(myMarkerDx, -myMarkerDy) * 2.0 / canvasSize * projDistance;

    #ifndef PICKING_MODE
        vec2 texSize;
        if (isText == 1.0) {
            texSize = textTexSize;
        } else {
            texSize = iconTexSize;
        }
        if (isPitchWithMap == 0.0) {
            //当textPerspective:
            //值为1.0时: vGammaScale用cameraScale动态计算
            //值为0.0时: vGammaScale固定为1.2
            vGammaScale = mix(1.0, cameraScale, textPerspectiveRatio);
        } else {
            vGammaScale = cameraScale + mapPitch / 4.0;
        }
        vGammaScale = clamp(vGammaScale, 0.0, 1.0);

        vTexCoord = aTexCoord.xy / texSize;

        #ifdef ENABLE_COLLISION
            vOpacity = aOpacity / 255.0;
        #else
            vOpacity = 1.0;
        #endif

        #ifdef HAS_OPACITY
            vOpacity *= aColorOpacity / 255.0;
        #endif

        #ifdef HAS_TEXT_FILL
            vTextFill = aTextFill / 255.0;
        #endif

        #ifdef HAS_TEXT_HALO_FILL
            vTextHaloFill = aTextHaloFill / 255.0;
        #endif

        #ifdef HAS_TEXT_HALO_RADIUS
            vTextHaloRadius = aTextHaloRadius;
        #endif

        #ifdef HAS_TEXT_HALO_OPACITY
            vTextHaloOpacity = aTextHaloOpacity;
        #endif

        highlight_setVarying();
    #else
        #ifdef ENABLE_COLLISION
            bool visible = aOpacity == 255.0;
        #else
            bool visible = true;
        #endif

        fbo_picking_setData(gl_Position.w, visible);
    #endif
}
