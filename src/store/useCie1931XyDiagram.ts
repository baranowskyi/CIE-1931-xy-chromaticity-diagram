import { CIE_1931_DATASET } from "@/constants/CIE1931DataSet"
import { defineStore } from "pinia"
import { ref } from "vue"

interface Point {
    x: number
    y: number
}

export const useCie1931XyDiagram = defineStore("cie-1931-xy-diagram", () => {
    const canvasWidth = ref(600)
    const canvasHeight = ref(600)
    const canvasMargin = ref(60)
    const canvasBackgroundColor = ref("#ffffff")
    const plotWidth = ref(canvasWidth.value - 2 * canvasMargin.value)
    const plotHeight = ref(canvasHeight.value - 2 * canvasMargin.value)
    const plotX = ref(canvasMargin.value)
    const plotY = ref(canvasMargin.value)
    const showGrid = ref(true)
    const showLabels = ref(true)
    const showDiagonalLine = ref(true)
    const showSpectralLabels = ref(true)
    const showColorSpaces = ref(true)

    function setupHighDPICanvas(
        canvas: HTMLCanvasElement,
        width: number,
        height: number
    ): { ctx: CanvasRenderingContext2D; dpr: number } {
        const dpr = window.devicePixelRatio || 1
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Unable to get canvas context")

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        canvas.style.width = width + "px"
        canvas.style.height = height + "px"
        ctx.imageSmoothingEnabled = false
        ctx.textRendering = "geometricPrecision"

        return { ctx, dpr }
    }

    function createGrid(
        ctx: CanvasRenderingContext2D,
        mainLineWidth = 1,
        mainLineColor = "#d0d0d0",
        secondLineWidth = 0.7,
        secondLineColor = "#f0f0f0"
    ) {
        const drawGridLines = (
            lineWidth: number,
            lineColor: string,
            step: number,
            isVertical: boolean
        ) => {
            ctx.strokeStyle = lineColor
            ctx.lineWidth = lineWidth

            ctx.beginPath()

            for (let i = 0; i <= 10; i += step) {
                const progress = i / 10
                const coord = isVertical
                    ? plotX.value + Math.round(progress * plotWidth.value) + 0.5
                    : plotY.value +
                      Math.round(progress * plotHeight.value) +
                      0.5

                if (isVertical) {
                    ctx.moveTo(coord, plotY.value)
                    ctx.lineTo(coord, plotY.value + plotHeight.value)
                } else {
                    ctx.moveTo(plotX.value, coord)
                    ctx.lineTo(plotX.value + plotWidth.value, coord)
                }
            }

            ctx.stroke()
        }

        // main lines
        drawGridLines(mainLineWidth, mainLineColor, 1, true) // vertical
        drawGridLines(mainLineWidth, mainLineColor, 1, false) // horizontal

        // second lines
        drawGridLines(secondLineWidth, secondLineColor, 0.25, true) // vertical
        drawGridLines(secondLineWidth, secondLineColor, 0.25, false) // horizontal
    }

    function createGraphLabels(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#000000"
        ctx.font = "12px Arial"
        ctx.textAlign = "center"

        // X axis
        for (let i = 0; i <= 10; i++) {
            const x = plotX.value + (i / 10) * plotWidth.value
            const value = (i / 10).toFixed(1)
            ctx.fillText(value, x, plotY.value + plotHeight.value + 20)
        }

        // Y axis
        ctx.textAlign = "right"
        for (let i = 0; i <= 10; i++) {
            const y =
                plotY.value + plotHeight.value - (i / 10) * plotHeight.value
            const value = (i / 10).toFixed(1)
            ctx.fillText(value, plotX.value - 10, y + 4)
        }

        // axis name
        ctx.textAlign = "center"
        ctx.fillText("x", canvasWidth.value / 2, canvasHeight.value - 20)

        ctx.save()
        ctx.translate(20, canvasHeight.value / 2)
        //ctx.rotate(-Math.PI / 2)
        ctx.fillText("y", 0, 0)
        ctx.restore()
    }

    function createDiagonalLine(
        ctx: CanvasRenderingContext2D,
        lineWidth = 1,
        lineColor = "#666666"
    ) {
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = lineColor
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        const lineStart = toCanvasCoords(0, 1)
        const lineEnd = toCanvasCoords(1, 0)
        ctx.moveTo(Math.round(lineStart.x), Math.round(lineStart.y))
        ctx.lineTo(Math.round(lineEnd.x), Math.round(lineEnd.y))
        ctx.stroke()
        ctx.setLineDash([])
    }

    function toCanvasCoords(x: number, y: number): Point {
        return {
            x: plotX.value + x * plotWidth.value,
            y: plotY.value + plotHeight.value - y * plotHeight.value,
        }
    }

    function createSpectralLocusPath(
        ctx: CanvasRenderingContext2D,
        toCanvasCoordinates: (x: number, y: number) => Point
    ): void {
        const path = new Path2D()
        const spectralLocus = CIE_1931_DATASET

        spectralLocus.forEach((point, index) => {
            const canvasPoint = toCanvasCoordinates(point.x, point.y)
            if (index === 0) {
                path.moveTo(canvasPoint.x, canvasPoint.y)
            } else {
                path.lineTo(canvasPoint.x, canvasPoint.y)
            }
        })
        path.closePath() // important: close the path

        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 1
        ctx.stroke(path)
    }

    function isPointInSpectralLocus(x: number, y: number): boolean {
        if (x < 0 || y < 0 || x > 1 || y > 1) {
            return false
        }

        // additional check: the point must be below the line x + y = 1
        if (x + y > 1.001) {
            return false
        }

        const spectralLocus = CIE_1931_DATASET

        // improved ray casting algorithm with edge case handling
        let inside = false
        const eps = 1e-10

        for (
            let i = 0, j = spectralLocus.length - 1;
            i < spectralLocus.length;
            j = i++
        ) {
            const xi = spectralLocus[i]!.x
            const yi = spectralLocus[i]!.y
            const xj = spectralLocus[j]!.x
            const yj = spectralLocus[j]!.y

            // skipping horizontal edges
            if (Math.abs(yi - yj) < eps) continue

            // checking whether the ray intersects an edge
            if (yi > y + eps !== yj > y + eps) {
                // calculate the x-coordinate of the intersection
                const xIntersect = xi + ((xj - xi) * (y - yi)) / (yj - yi)

                // if the intersection is to the right of the point, switch the state
                if (x < xIntersect - eps) {
                    inside = !inside
                }
            }
        }

        return inside
    }

    function xyzToRgb(
        X: number,
        Y: number,
        Z: number
    ): { r: number; g: number; b: number } {
        // sRGB matrix (D65 illuminant)
        let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986
        let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415
        let b = X * 0.0557 + Y * -0.204 + Z * 1.057

        // gamma correction sRGB
        const gammaCorrect = (value: number): number => {
            if (value > 0.0031308) {
                return 1.055 * Math.pow(value, 1.0 / 2.4) - 0.055
            } else {
                return 12.92 * value
            }
        }

        r = gammaCorrect(r)
        g = gammaCorrect(g)
        b = gammaCorrect(b)

        // normalizing for saturation
        const max = Math.max(r, g, b)
        if (max > 1) {
            r = r / max
            g = g / max
            b = b / max
        }

        return {
            r: Math.max(0, Math.min(1, r)) * 255,
            g: Math.max(0, Math.min(1, g)) * 255,
            b: Math.max(0, Math.min(1, b)) * 255,
        }
    }

    function getColorFromXY(x: number, y: number): string {
        if (x < 0 || y <= 0 || x + y > 1) {
            return "rgba(0,0,0,0)"
        }

        const z = 1.0 - x - y
        if (z < 0) {
            return "rgba(0,0,0,0)"
        }

        const Y = 1.0
        const X = (x / y) * Y
        const Z = (z / y) * Y

        const rgb = xyzToRgb(X, Y, Z)

        if (isNaN(rgb.r) || isNaN(rgb.g) || isNaN(rgb.b)) {
            return "rgba(0,0,0,0)"
        }

        return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(
            rgb.b
        )})`
    }

    function createGradient(ctx: CanvasRenderingContext2D) {
        // create a temporary canvas without scaling to generate a gradient
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = canvasWidth.value
        tempCanvas.height = canvasHeight.value
        const tempCtx = tempCanvas.getContext("2d")
        if (!tempCtx) return

        // filling the temporary canvas with a gradient
        const imageData = tempCtx.createImageData(
            canvasWidth.value,
            canvasHeight.value
        )
        const data = imageData.data

        // we fill pixel by pixel only within the spectral locus
        for (let canvasY = 0; canvasY < canvasHeight.value; canvasY++) {
            for (let canvasX = 0; canvasX < canvasWidth.value; canvasX++) {
                const index = (canvasY * canvasWidth.value + canvasX) * 4

                // checking if we are in the graph area
                if (
                    canvasX >= plotX.value &&
                    canvasX < plotX.value + plotWidth.value &&
                    canvasY >= plotY.value &&
                    canvasY < plotY.value + plotHeight.value
                ) {
                    // convert canvas coordinates to chart coordinates
                    const diagramX = (canvasX - plotX.value) / plotWidth.value
                    const diagramY =
                        1 - (canvasY - plotY.value) / plotHeight.value

                    // we use subpixel sampling for better quality at edges
                    let insideCount = 0
                    let totalR = 0,
                        totalG = 0,
                        totalB = 0
                    const samples = 2 // 2x2 sampling

                    for (let sy = 0; sy < samples; sy++) {
                        for (let sx = 0; sx < samples; sx++) {
                            const offsetX =
                                (sx + 0.5) / samples / plotWidth.value
                            const offsetY =
                                (sy + 0.5) / samples / plotHeight.value

                            const sampleX = diagramX + offsetX
                            const sampleY = diagramY - offsetY

                            if (isPointInSpectralLocus(sampleX, sampleY)) {
                                insideCount++
                                const colorStr = getColorFromXY(
                                    sampleX,
                                    sampleY
                                )

                                if (colorStr !== "rgba(0,0,0,0)") {
                                    const matches = colorStr.match(/\d+/g)
                                    if (matches) {
                                        totalR += parseInt(matches[0]!)
                                        totalG += parseInt(matches[1]!)
                                        totalB += parseInt(matches[2]!)
                                    }
                                }
                            }
                        }
                    }

                    if (insideCount > 0) {
                        // averaging color across samples
                        data[index] = Math.round(totalR / insideCount) // R
                        data[index + 1] = Math.round(totalG / insideCount) // G
                        data[index + 2] = Math.round(totalB / insideCount) // B
                        data[index + 3] = Math.round(
                            (255 * insideCount * 0.8) / (samples * samples)
                        ) // A including coverage and opacity (0.8 = 80% opacity)
                    } else {
                        data[index + 3] = 0 // transparent to areas outside the spectral locus
                    }
                } else {
                    data[index + 3] = 0 // transparent to off-graph areas
                }
            }
        }

        // place the gradient on the temporary canvas
        tempCtx.putImageData(imageData, 0, 0)

        // drawing a gradient on the main canvas with correct scaling
        ctx.drawImage(tempCanvas, 0, 0, canvasWidth.value, canvasHeight.value)
    }

    return {
        canvasWidth,
        canvasHeight,
        canvasMargin,
        canvasBackgroundColor,
        plotWidth,
        plotHeight,
        plotX,
        plotY,
        showGrid,
        showLabels,
        showDiagonalLine,
        showSpectralLabels,
        showColorSpaces,

        setupHighDPICanvas,
        createGrid,
        createGraphLabels,
        createDiagonalLine,
        toCanvasCoords,
        createSpectralLocusPath,
        isPointInSpectralLocus,
        createGradient,
        xyzToRgb,
    }
})
