<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useCie1931XyDiagram } from '@/store/useCie1931XyDiagram'
import { storeToRefs } from 'pinia'
import { DISPLAY_P3_SPACE_COORDINATES, RGB_SPACE_COORDINATES } from '@/constants/colorCoordinate'

const { canvasWidth, canvasHeight } = storeToRefs(useCie1931XyDiagram())
const { setupHighDPICanvas, toCanvasCoords } = useCie1931XyDiagram()

const colorSpacesCanvasRef = useTemplateRef('colorSpacesCanvasRef')

function drawColorSpace(
  ctx: CanvasRenderingContext2D,
  coordinates: Array<{ x: number; y: number }>,
  lineDash: number[] = [],
  strokeStyle: string = '#ffffff',
) {
  ctx.beginPath()
  coordinates.forEach((point, index) => {
    const canvasPoint = toCanvasCoords(point.x, point.y)
    const roundedX = Math.round(canvasPoint.x)
    const roundedY = Math.round(canvasPoint.y)

    if (index === 0) {
      ctx.moveTo(roundedX, roundedY)
    } else {
      ctx.lineTo(roundedX, roundedY)
    }
  })
  ctx.closePath()
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = 1
  ctx.setLineDash(lineDash)
  ctx.stroke()
}

function createColorSpaces(ctx: CanvasRenderingContext2D) {
  // sRGB
  drawColorSpace(ctx, RGB_SPACE_COORDINATES)

  // Display P3
  drawColorSpace(ctx, DISPLAY_P3_SPACE_COORDINATES, [5, 5])
}

onMounted(() => {
  if (colorSpacesCanvasRef.value) {
    const { ctx } = setupHighDPICanvas(
      colorSpacesCanvasRef.value,
      canvasWidth.value,
      canvasHeight.value,
    )
    if (!ctx) {
      console.error('Color spaces context is failed.')
      return
    }

    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    createColorSpaces(ctx)
  }
})
</script>

<template>
  <canvas
    ref="colorSpacesCanvasRef"
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
