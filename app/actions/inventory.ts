'use server'

import prisma from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        })
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
