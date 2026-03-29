<script setup lang="ts">
import {
  WHITE_POINT_D50_COORDINATES,
  WHITE_POINT_D65_COORDINATES,
} from '@/constants/colorCoordinate'
import { onMounted, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useCie1931XyDiagram } from '@/store/useCie1931XyDiagram'

const { canvasWidth, canvasHeight } = storeToRefs(useCie1931XyDiagram())
const { setupHighDPICanvas, toCanvasCoords } = useCie1931XyDiagram()

const whitePointsCanvasRef = useTemplateRef('whitePointsCanvasRef')

function createWhitePoint(
  ctx: CanvasRenderingContext2D,
  pointName: string,
  pointCoordinates: { x: number; y: number },
  pointNameOffset: { x: number; y: number } = { x: 0, y: 0 },
  pointColor = '#000000',
  pointNameAlign: 'left' | 'center' | 'right' = 'left',
  pointBorderWidth = 1,
) {
  const whitePoint = toCanvasCoords(pointCoordinates.x, pointCoordinates.y)

  const pointRadius = 3
  const roundedX = Math.round(whitePoint.x)
  const roundedY = Math.round(whitePoint.y)

  // black fill
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(roundedX, roundedY, pointRadius + pointBorderWidth, 0, 2 * Math.PI)
  ctx.fill()

  // white fill
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(roundedX, roundedY, pointRadius, 0, 2 * Math.PI)
  ctx.fill()

  // text
  ctx.fillStyle = pointColor
  ctx.textAlign = pointNameAlign
  ctx.fillText(pointName, whitePoint.x + pointNameOffset.x, whitePoint.y + pointNameOffset.y)
}

onMounted(() => {
  if (whitePointsCanvasRef.value) {
    const { ctx } = setupHighDPICanvas(
      whitePointsCanvasRef.value,
      canvasWidth.value,
      canvasHeight.value,
    )
    if (!ctx) {
      console.error('White points context is failed.')
      return
    }

    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    createWhitePoint(ctx, 'D65', WHITE_POINT_D65_COORDINATES, {
      x: 8,
      y: 15,
    })
    createWhitePoint(ctx, 'D50', WHITE_POINT_D50_COORDINATES, {
      x: 10,
      y: -5,
    })
  }
})
</script>

<template>
  <canvas
    ref="whitePointsCanvasRef"
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
