'use server'

import prisma from '@/app/lib/prisma'

export type ReportType = 'daily' | 'weekly' | 'monthly'

export async function getSalesReport(date: Date, type: ReportType) {
    try {
        const startDate = new Date(date)
        const endDate = new Date(date)

        if (type === 'daily') {
            startDate.setHours(0, 0, 0, 0)
            endDate.setHours(23, 59, 59, 999)
        } else if (type === 'weekly') {
            const day = startDate.getDay()
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is sunday
            startDate.setDate(diff)
            startDate.setHours(0, 0, 0, 0)

            endDate.setDate(startDate.getDate() + 6)
            endDate.setHours(23, 59, 59, 999)
        } else if (type === 'monthly') {
            startDate.setDate(1)
            startDate.setHours(0, 0, 0, 0)

            endDate.setMonth(endDate.getMonth() + 1)
            endDate.setDate(0)
            endDate.setHours(23, 59, 59, 999)
        }

        const bills = await prisma.bill.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: true
            }
        })

        // Identify items with missing purchasePrice (historical data)
        const missingPriceProductIds = new Set<number>()
        bills.forEach(bill => {
            bill.items.forEach(item => {
                if (item.purchasePrice === 0) {
                    missingPriceProductIds.add(item.productId)
                }
            })
        })

        // Fetch current purchase prices for fallback
        const productMap = new Map<number, number>()
        if (missingPriceProductIds.size > 0) {
            const products = await prisma.product.findMany({
                where: { id: { in: Array.from(missingPriceProductIds) } },
                select: { id: true, purchasePrice: true }
            })
            products.forEach(p => productMap.set(p.id, p.purchasePrice))
        }

        let totalSales = 0
        let returnedAmount = 0
        let productValue = 0 // Cost of Goods Sold (Net)

        bills.forEach(bill => {
            bill.items.forEach(item => {
                const quantitySold = item.quantity
                const quantityReturned = item.returnedQuantity || 0
                const netQuantity = quantitySold - quantityReturned

                // Gross Sales
                totalSales += quantitySold * item.price

                // Returns
                returnedAmount += quantityReturned * item.price

                // COGS (Net)
                let cost = item.purchasePrice
                if (cost === 0) {
                    cost = productMap.get(item.productId) || 0
                }
                productValue += cost * netQuantity
            })
        })

        const netSales = totalSales - returnedAmount
        const profit = netSales - productValue

        return {
            success: true,
            data: {
                totalSales: netSales, // Reporting Net Sales as the primary "Total Sales" figure
                grossSales: totalSales,
                returnedAmount,
                productValue,
                profit,
                billCount: bills.length,
                bills
            }
        }

    } catch (error) {
        console.error('Failed to generate sales report:', error)
        return { success: false, error: 'Failed to generate sales report' }
    }
}
