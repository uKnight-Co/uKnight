"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface Node {
    id: number
    x: number
    y: number
    vx: number
    vy: number
}

interface Connection {
    id: number
    fromId: number
    toId: number
    progress: number
}

export default function AnimatedNetworkBg() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener("resize", resizeCanvas)

        // Create floating nodes
        const nodeCount = 12
        const nodes: Node[] = Array.from({ length: nodeCount }, (_, i) => ({
            id: i,
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
        }))

        // Animation loop
        let animationFrameId: number
        let time = 0

        const animate = () => {
            // Clear with dark background
            ctx.fillStyle = "rgba(15, 23, 42, 0.05)"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Update node positions
            nodes.forEach((node) => {
                node.x += node.vx
                node.y += node.vy

                // Wrap around edges
                if (node.x < 0) node.x = canvas.width
                if (node.x > canvas.width) node.x = 0
                if (node.y < 0) node.y = canvas.height
                if (node.y > canvas.height) node.y = 0

                // Draw nodes
                ctx.fillStyle = `rgba(251, 191, 36, 0.6)`
                ctx.beginPath()
                ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2)
                ctx.fill()
            })

            // Draw connections between nearby nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[j].x - nodes[i].x
                    const dy = nodes[j].y - nodes[i].y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < 150) {
                        const opacity = (1 - distance / 150) * 0.3
                        ctx.strokeStyle = `rgba(251, 191, 36, ${opacity})`
                        ctx.lineWidth = 1
                        ctx.beginPath()
                        ctx.moveTo(nodes[i].x, nodes[i].y)
                        ctx.lineTo(nodes[j].x, nodes[j].y)
                        ctx.stroke()
                    }
                }
            }

            // Draw animated flowing lines from left to right
            time += 0.01
            const flowWidth = 3000
            const flowHeight = 4

            for (let i = 0; i < 5; i++) {
                const yPos = (canvas.height / 6) * (i + 1)
                const xOffset = ((time * 150) + i * 600) % flowWidth
                const gradient = ctx.createLinearGradient(xOffset - 200, yPos, xOffset + 200, yPos)
                gradient.addColorStop(0, "rgba(251, 191, 36, 0)")
                gradient.addColorStop(0.3, "rgba(251, 191, 36, 0.6)")
                gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.8)")
                gradient.addColorStop(0.7, "rgba(251, 191, 36, 0.6)")
                gradient.addColorStop(1, "rgba(251, 191, 36, 0)")

                ctx.fillStyle = gradient
                ctx.fillRect(xOffset - 300, yPos - flowHeight, 600, flowHeight * 2)
            }

            // Draw hexagon grid
            ctx.strokeStyle = "rgba(251, 191, 36, 0.08)"
            ctx.lineWidth = 0.5
            const hexSize = 60
            const hexHeight = hexSize * Math.sqrt(3)
            const hexWidth = hexSize * 2

            for (let row = -3; row < Math.ceil(canvas.height / hexHeight) + 3; row++) {
                for (let col = -3; col < Math.ceil(canvas.width / hexWidth) + 3; col++) {
                    const x = col * hexWidth + (row % 2 === 0 ? 0 : hexWidth / 2)
                    const y = row * (hexHeight / 2)

                    // Draw hexagon
                    ctx.beginPath()
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i
                        const hx = x + hexSize * Math.cos(angle)
                        const hy = y + hexSize * Math.sin(angle)
                        if (i === 0) ctx.moveTo(hx, hy)
                        else ctx.lineTo(hx, hy)
                    }
                    ctx.closePath()
                    ctx.stroke()
                }
            }

            animationFrameId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener("resize", resizeCanvas)
        }
    }, [])

    return (
        <div className="fixed inset-0 overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
        </div>
    )
}
