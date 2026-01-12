'use server'

import prisma from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getProducts() {
    try {
        // Fetch all products first
        const products = await prisma.product.findMany({})

        // Custom sort: Alphabetic first, then Numeric
        products.sort((a, b) => {
            const nameA = a.name;
            const nameB = b.name;
            const isANum = /^\d/.test(nameA);
            const isBNum = /^\d/.test(nameB);

            if (isANum && !isBNum) return 1; // Numbers go after letters
            if (!isANum && isBNum) return -1; // Letters go before numbers
            return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        });

        return { success: true, data: products }
    } catch (error) {
        console.error('Failed to fetch products:', error)
        return { success: false, error: 'Failed to fetch products' }
    }
}

export async function addProduct(formData: FormData) {
    try {
        const name = formData.get('name') as string
        const quantity = parseInt(formData.get('quantity') as string)
        const price = parseFloat(formData.get('price') as string)
        const purchasePrice = parseFloat(formData.get('purchasePrice') as string)

        if (!name || isNaN(quantity) || isNaN(price)) {
            return { success: false, error: 'Invalid input' }
        }

        await prisma.product.create({
            data: {
                name,
                quantity,
                price,
                purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
            },
        })

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to add product:', error)
        return { success: false, error: 'Failed to add product' }
    }
}

export async function updateManualPrice(id: number, price: number) {
    try {
        await prisma.product.update({
            where: { id },
            data: { manualPrice: price }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to update manual price:', error)
        return { success: false, error: 'Failed to update manual price' }
    }
}

export async function updateStock(id: number, change: number) {
    try {
        // Current stock check to prevent negative (optional, but good)
        if (change < 0) {
            const product = await prisma.product.findUnique({ where: { id } })
            if (product && product.quantity + change < 0) {
                return { success: false, error: 'Insufficient stock' }
            }
        }

        await prisma.product.update({
            where: { id },
            data: {
                quantity: {
                    increment: change,
                },
            },
        })

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to update stock:', error)
        return { success: false, error: 'Failed to update stock' }
    }
}

export async function deleteProduct(id: number) {
    try {
        await prisma.product.delete({
            where: { id }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error: 'Failed to delete product' }
    }
}

export async function saveBill(data: {
    customerName?: string,
    totalAmount: number,
    items: { productId: number, name: string, quantity: number, price: number, total: number }[]
}) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch products to get current purchase prices
            const productIds = data.items.map(item => item.productId)
            const products = await tx.product.findMany({
                where: { id: { in: productIds } }
            })
            const productMap = new Map(products.map(p => [p.id, p]))

            // 2. Create the Bill
            const bill = await tx.bill.create({
                data: {
                    customerName: data.customerName || 'Walk-in Customer',
                    totalAmount: data.totalAmount,
                    items: {
                        create: data.items.map(item => {
                            const product = productMap.get(item.productId)
                            return {
                                productId: item.productId,
                                productName: item.name,
                                quantity: item.quantity,
                                price: item.price,
                                purchasePrice: product?.purchasePrice ?? 0, // Store current purchase price
                                total: item.total
                            }
                        })
                    }
                }
            })

            // 3. Decrement stock for each item
            for (const item of data.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        quantity: {
                            decrement: item.quantity
                        }
                    }
                })
            }

            return bill;
        })

        revalidatePath('/')
        return { success: true, data: result }
    } catch (error) {
        console.error('Failed to save bill:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred while saving bill' }
    }
}

export async function getBills() {
    try {
        const bills = await prisma.bill.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 50, // Limit to recent 50 bills
            include: {
                items: true
            }
        })
        return { success: true, data: bills }
    } catch (error) {
        console.error('Failed to fetch bills:', error)
        return { success: false, error: 'Failed to fetch bills' }
    }
}
