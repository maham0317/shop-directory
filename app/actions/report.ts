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

        const productStats = new Map<number, {
            name: string,
            quantity: number,
            returned: number,
            revenue: number,
            cost: number,
            profit: number
        }>()

        bills.forEach(bill => {
            bill.items.forEach(item => {
                const quantitySold = item.quantity
                const quantityReturned = item.returnedQuantity || 0
                const netQuantity = quantitySold - quantityReturned

                // Gross Sales (Total value of items sold)
                const itemGross = quantitySold * item.price
                totalSales += itemGross

                // Returns Value
                const itemReturnedVal = quantityReturned * item.price
                returnedAmount += itemReturnedVal

                // COGS (Net)
                let unitCost = item.purchasePrice
                if (unitCost === 0) {
                    unitCost = productMap.get(item.productId) || 0 // Fallback
                }
                const itemCost = unitCost * netQuantity
                productValue += itemCost

                // Per Product Stats
                const existing = productStats.get(item.productId) || {
                    name: item.productName,
                    quantity: 0,
                    returned: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0
                }

                existing.quantity += quantitySold
                existing.returned += quantityReturned
                existing.revenue += (itemGross - itemReturnedVal)
                existing.cost += itemCost
                // Profit = Net Revenue - Cost
                existing.profit = existing.revenue - existing.cost

                productStats.set(item.productId, existing)
            })
        })

        const netSales = totalSales - returnedAmount
        const profit = netSales - productValue

        return {
            success: true,
            data: {
                totalSales: netSales,
                grossSales: totalSales,
                returnedAmount,
                productValue,
                profit,
                billCount: bills.length,
                bills,
                productBreakdown: Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue)
            }
        }

    } catch (error) {
        console.error('Failed to generate sales report:', error)
        return { success: false, error: 'Failed to generate sales report' }
    }
}

export async function saveMonthlySnapshot(month: number, year: number, data: { totalSales: number, totalProfit: number, totalReturns: number }) {
    try {
        await prisma.monthlyReport.upsert({
            where: {
                month_year: {
                    month,
                    year
                }
            },
            update: {
                totalSales: data.totalSales,
                totalProfit: data.totalProfit,
                totalReturns: data.totalReturns,
                createdAt: new Date()
            },
            create: {
                month,
                year,
                totalSales: data.totalSales,
                totalProfit: data.totalProfit,
                totalReturns: data.totalReturns
            }
        })
        return { success: true }
    } catch (error) {
        console.error('Failed to create snapshot:', error)
        return { success: false, error: 'Failed to save snapshot' }
    }
}

export async function getMonthlySnapshots() {
    try {
        const reports = await prisma.monthlyReport.findMany({
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ]
        })
        return { success: true, data: reports }
    } catch (error) {
        console.error('Failed to get snapshots:', error)
        return { success: false, error: 'Failed to get saved reports' }
    }
}
