<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue"
import { useCie1931XyDiagram } from "@/store/useCie1931XyDiagram"
import { storeToRefs } from "pinia"
import { CIE_1931_DATASET } from "@/constants/CIE1931DataSet"

const { canvasWidth, canvasHeight } = storeToRefs(useCie1931XyDiagram())
const { setupHighDPICanvas, toCanvasCoords } = useCie1931XyDiagram()

const spectralLabelssCanvasRef = useTemplateRef("spectralLabelssCanvasRef")

function createSpectralLabels(ctx: CanvasRenderingContext2D) {
    const wavelengthsToShow = [
        470, 475, 480, 485, 490, 495, 500, 505, 515, 520, 525, 530, 535, 540,
        545, 550, 555, 560, 565, 570, 575, 580, 585, 590, 600, 700,
    ]

    const spectralLocus = CIE_1931_DATASET

    spectralLocus.forEach((point) => {
        if (point.wavelength && wavelengthsToShow.includes(point.wavelength)) {
            const canvasPoint = toCanvasCoords(point.x, point.y)

            let offset = { x: 0, y: -10 }

            if (point.wavelength > 525 && point.wavelength <= 700) {
                offset = { x: 15, y: 0 }
            } else if (point.wavelength > 525) {
                offset = { x: 0, y: 15 }
            } else if (point.wavelength < 515 && point.wavelength >= 490) {
                offset = { x: 25, y: 0 }
            } else if (point.wavelength <= 485 && point.wavelength > 400) {
                offset = { x: -10, y: 5 }
            }

            const pointRadius = 3
            const roundedX = Math.round(canvasPoint.x)
            const roundedY = Math.round(canvasPoint.y)

            // black fill
            ctx.fillStyle = "#000000"
            ctx.beginPath()
            ctx.arc(roundedX, roundedY, pointRadius + 1, 0, 2 * Math.PI)
            ctx.fill()

            // white fill
            ctx.fillStyle = "#FFFFFF"
            ctx.beginPath()
            ctx.arc(roundedX, roundedY, pointRadius, 0, 2 * Math.PI)
            ctx.fill()

            ctx.fillStyle = "#333333"
            ctx.font = "11px Arial"

            if (point.wavelength >= 525 && point.wavelength <= 700) {
                ctx.textAlign = "left"
            } else if (point.wavelength < 525) {
                ctx.textAlign = "right"
            } else {
                ctx.textAlign = "center"
            }

            ctx.fillText(
                `${point.wavelength}`,
                Math.round(canvasPoint.x + offset.x),
                Math.round(canvasPoint.y + offset.y)
            )
        }
    })
}

onMounted(() => {
    if (spectralLabelssCanvasRef.value) {
        const { ctx } = setupHighDPICanvas(
            spectralLabelssCanvasRef.value,
            canvasWidth.value,
            canvasHeight.value
        )
        if (!ctx) {
            console.error("Spectral labels context is failed.")
            return
        }

        ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

        createSpectralLabels(ctx)
    }
})
</script>

<template>
    <canvas
        ref="spectralLabelssCanvasRef"
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
