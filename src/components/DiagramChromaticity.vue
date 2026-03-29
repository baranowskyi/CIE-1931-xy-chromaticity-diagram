<!-- CIE xy chromaticity diagram -->

<script setup lang="ts">
import { onMounted, useTemplateRef, reactive } from 'vue'
import { useCie1931XyDiagram } from '@/store/useCie1931XyDiagram'
import WhitePoints from '@/components/WhitePoints.vue'
import ColorSpaces from '@/components/ColorSpaces.vue'
import SpectralLabels from '@/components/SpectralLabels.vue'
import CustomPoints from '@/components/CustomPoints.vue'
import type { Point } from '@/types/global'

const {
  setupHighDPICanvas,
  createGrid,
  createGraphLabels,
  createDiagonalLine,
  toCanvasCoords,
  createSpectralLocusPath,
  isPointInSpectralLocus,
  createGradient,
  xyzToRgb,
} = useCie1931XyDiagram()

interface ColorInfo {
  x: number
  y: number
  r: number
  g: number
  b: number
  visible: boolean
  mouseX: number
  mouseY: number
}

const canvasWidth = 600
const canvasHeight = 600
const canvasMargin = 60
const canvasBackgroundColor = '#ffffff'
const plotWidth = canvasWidth - 2 * canvasMargin
const plotHeight = canvasHeight - 2 * canvasMargin
const plotX = canvasMargin
const plotY = canvasMargin
const showGrid = true
const showLabels = true
const showDiagonalLine = true

const canvasRef = useTemplateRef('canvasRef')
const colorInfo = reactive<ColorInfo>({
  x: 0,
  y: 0,
  r: 0,
  g: 0,
  b: 0,
  visible: false,
  mouseX: 0,
  mouseY: 0,
})

function getRgbFromXY(x: number, y: number): { r: number; g: number; b: number } | null {
  if (x < 0 || y <= 0 || x + y > 1) {
    return null
  }

  const z = 1.0 - x - y
  if (z < 0) {
    return null
  }

  const Y = 1.0
  const X = (x / y) * Y
  const Z = (z / y) * Y

  const rgb = xyzToRgb(X, Y, Z)

  if (isNaN(rgb.r) || isNaN(rgb.g) || isNaN(rgb.b)) {
    return null
  }

  return {
    r: Math.round(rgb.r),
    g: Math.round(rgb.g),
    b: Math.round(rgb.b),
  }
}

function toDiagramCoords(canvasX: number, canvasY: number): Point {
  return {
    x: (canvasX - plotX) / plotWidth,
    y: 1 - (canvasY - plotY) / plotHeight,
  }
}

function drawXYChromaticityDiagram(canvas: HTMLCanvasElement): void {
  const { ctx } = setupHighDPICanvas(canvas, canvasWidth, canvasHeight)
  if (!ctx) {
    console.error('Unable to get canvas context')
    return
  }

  // graph background
  ctx.fillStyle = canvasBackgroundColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // graph settings
  if (showGrid) createGrid(ctx)
  if (showLabels) createGraphLabels(ctx)
  if (showDiagonalLine) createDiagonalLine(ctx)

  createSpectralLocusPath(ctx, toCanvasCoords)
  createGradient(ctx)
}

function handleMouseMove(event: MouseEvent) {
  if (!canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const canvasX = event.clientX - rect.left
  const canvasY = event.clientY - rect.top

  // Check if mouse is within the plot area
  if (
    canvasX >= plotX &&
    canvasX <= plotX + plotWidth &&
    canvasY >= plotY &&
    canvasY <= plotY + plotHeight
  ) {
    const diagramCoords = toDiagramCoords(canvasX, canvasY)

    if (isPointInSpectralLocus(diagramCoords.x, diagramCoords.y)) {
      const rgb = getRgbFromXY(diagramCoords.x, diagramCoords.y)

      if (rgb) {
        colorInfo.x = Math.round(diagramCoords.x * 1000) / 1000
        colorInfo.y = Math.round(diagramCoords.y * 1000) / 1000
        colorInfo.r = rgb.r
        colorInfo.g = rgb.g
        colorInfo.b = rgb.b
        colorInfo.visible = true
        colorInfo.mouseX = event.clientX
        colorInfo.mouseY = event.clientY
      } else {
        colorInfo.visible = false
      }
    } else {
      colorInfo.visible = false
    }
  } else {
    colorInfo.visible = false
  }
}

function handleMouseLeave() {
  colorInfo.visible = false
}

onMounted(() => {
  if (canvasRef.value) {
    drawXYChromaticityDiagram(canvasRef.value)
  }
})
</script>

<template>
  <div class="relative flex flex-col justify-center items-center p-5 gap-2.5">
    <h1>CIE 1931 xy chromaticity diagram</h1>
    <div class="relative">
      <canvas
        ref="canvasRef"
        class="high-dpi-canvas border border-gray-300 rounded cursor-crosshair"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      ></canvas>
      <SpectralLabels />
      <ColorSpaces />
      <WhitePoints />
      <CustomPoints />
    </div>

    <!-- Color info tooltip -->
    <div
      v-if="colorInfo.visible"
      class="absolute pointer-events-none bg-black bg-opacity-80 text-white text-xs rounded p-2 z-20"
      :style="{
        left: `${colorInfo.mouseX + 15}px`,
        top: `${colorInfo.mouseY - 60}px`,
      }"
    >
      <div class="flex items-center gap-2 mb-1">
        <div
          class="w-4 h-4 border border-white"
          :style="{
            backgroundColor: `rgb(${colorInfo.r}, ${colorInfo.g}, ${colorInfo.b})`,
          }"
        ></div>
        <span>RGB({{ colorInfo.r }}, {{ colorInfo.g }}, {{ colorInfo.b }})</span>
      </div>
      <div>x: {{ colorInfo.x }}, y: {{ colorInfo.y }}</div>
    </div>
  </div>
</template>

<style scoped>
.high-dpi-canvas {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-crisp-edges;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
