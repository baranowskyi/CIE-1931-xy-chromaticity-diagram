<script setup lang="ts">
import { onMounted, reactive, ref, useTemplateRef } from 'vue'
import { useCie1931XyDiagram } from '@/store/useCie1931XyDiagram'
import { storeToRefs } from 'pinia'

interface CustomPoint {
  x: number
  y: number
  hex: string
}

const { canvasWidth, canvasHeight } = storeToRefs(useCie1931XyDiagram())
const { setupHighDPICanvas, toCanvasCoords, isPointInSpectralLocus } = useCie1931XyDiagram()

const customPointsCanvasRef = useTemplateRef('customPointsCanvasRef')

const hexInput = ref('')
const customPoints = reactive<CustomPoint[]>([])

function rgbToXyz(r: number, g: number, b: number): { X: number; Y: number; Z: number } {
  // Normalizing RGB values (0-1)
  r = r / 255
  g = g / 255
  b = b / 255

  // Inverse gamma correction sRGB
  const inverseGammaCorrect = (value: number): number => {
    if (value > 0.04045) {
      return Math.pow((value + 0.055) / 1.055, 2.4)
    } else {
      return value / 12.92
    }
  }

  r = inverseGammaCorrect(r)
  g = inverseGammaCorrect(g)
  b = inverseGammaCorrect(b)

  // Transformation into XYZ (sRGB, D65)
  const X = r * 0.4124 + g * 0.3576 + b * 0.1805
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const Z = r * 0.0193 + g * 0.1192 + b * 0.9505

  return { X, Y, Z }
}

function xyzToXy(X: number, Y: number, Z: number): { x: number; y: number } {
  const sum = X + Y + Z
  if (sum === 0) return { x: 0, y: 0 }
  return {
    x: X / sum,
    y: Y / sum,
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  if (!match) {
    return null
  }

  return {
    r: parseInt(match[1]!, 16),
    g: parseInt(match[2]!, 16),
    b: parseInt(match[3]!, 16),
  }
}

function addPointFromHex() {
  if (!hexInput.value) return

  const rgb = hexToRgb(hexInput.value)
  if (!rgb) {
    alert('Wrong a HEX format')
    return
  }

  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b)
  const xy = xyzToXy(xyz.X, xyz.Y, xyz.Z)

  // Checking that a point is within a spectral locus
  if (!isPointInSpectralLocus(xy.x, xy.y)) {
    alert('The color is outside the visible range')
    return
  }

  // Adding a point to an array
  customPoints.push({
    x: xy.x,
    y: xy.y,
    hex: `#${hexInput.value.toUpperCase()}`,
  })

  // We update only the canvas with points
  updatePointsCanvas()

  // Clearing the input field
  hexInput.value = ''
}

function createCustomPoints(ctx: CanvasRenderingContext2D) {
  customPoints.forEach((point) => {
    const canvasPoint = toCanvasCoords(point.x, point.y)
    const roundedX = Math.round(canvasPoint.x)
    const roundedY = Math.round(canvasPoint.y)

    // Drawing a dot
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(roundedX, roundedY, 5, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = point.hex
    ctx.beginPath()
    ctx.arc(roundedX, roundedY, 4, 0, 2 * Math.PI)
    ctx.fill()

    // Signature with HEX value
    ctx.fillStyle = '#000000'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(point.hex, roundedX, roundedY - 10)
  })
}

function updatePointsCanvas() {
  if (!customPointsCanvasRef.value) return

  const { ctx } = setupHighDPICanvas(
    customPointsCanvasRef.value,
    canvasWidth.value,
    canvasHeight.value,
  )
  if (!ctx) {
    console.error('Unable to get points canvas context')
    return
  }

  // Clearing the canvas
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  // Drawing custom points
  createCustomPoints(ctx)
}

function clearCustomPoints() {
  customPoints.length = 0
  updatePointsCanvas()
}

onMounted(() => {
  if (customPointsCanvasRef.value) {
    updatePointsCanvas()
  }
})
</script>

<template>
  <div
    class="absolute -bottom-25 left-0 z-30 bg-white p-3 rounded border border-gray-300 w-full gap-2.5 flex flex-col"
  >
    <p class="text-xs text-gray-500 mt-1">Enter a HEX color (RRGGBB)</p>
    <div class="flex gap-2 items-center mb-2">
      <input
        v-model="hexInput"
        type="text"
        class="border border-gray-300 rounded px-2 py-1 text-sm w-24"
        @keyup.enter="addPointFromHex"
      />

      <button
        @click="addPointFromHex"
        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
      >
        Add
      </button>

      <button
        @click="clearCustomPoints"
        class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
      >
        Clear dots
      </button>
    </div>
  </div>
  <canvas
    ref="customPointsCanvasRef"
    class="absolute top-0 left-0 high-dpi-canvas pointer-events-none"
  >
  </canvas>
</template>

<style scoped>
.high-dpi-canvas {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-crisp-edges;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
