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


export async function updateProductName(id: number, name: string) {
    try {
        await prisma.product.update({
            where: { id },
            data: { name }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to update product name:', error)
        return { success: false, error: 'Failed to update product name' }
    }
}

export async function updateProductQuantity(id: number, newQuantity: number) {
    try {
        if (newQuantity < 0) {
            return { success: false, error: 'Quantity cannot be negative' }
        }
        await prisma.product.update({
            where: { id },
            data: { quantity: newQuantity }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to update product quantity:', error)
        return { success: false, error: 'Failed to update product quantity' }
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

export async function returnBillFull(billId: number) {
    try {
        await prisma.$transaction(async (tx) => {
            const bill = await tx.bill.findUnique({
                where: { id: billId },
                include: { items: true }
            })

            if (!bill) throw new Error('Bill not found')
            if (bill.status === 'RETURNED') throw new Error('Bill already returned')

            // 1. Mark bill as returned
            await tx.bill.update({
                where: { id: billId },
                data: { status: 'RETURNED' }
            })

            // 2. Loop items, return them to stock, update returnedQuantity
            for (const item of bill.items) {
                const remainingQty = item.quantity - item.returnedQuantity
                if (remainingQty > 0) {
                    // Update BillItem
                    await tx.billItem.update({
                        where: { id: item.id },
                        data: { returnedQuantity: item.quantity }
                    })
                    // Update Product Stock
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { increment: remainingQty } }
                    })
                }
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to return bill:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Return failed' }
    }
}

export async function returnBillItem(itemId: number, returnQty: number) {
    try {
        await prisma.$transaction(async (tx) => {
            const billItem = await tx.billItem.findUnique({
                where: { id: itemId },
                include: { bill: true }
            })
            if (!billItem) throw new Error('Item not found')

            if (billItem.returnedQuantity + returnQty > billItem.quantity) {
                throw new Error('Cannot return more than purchased')
            }

            // 1. Update BillItem
            await tx.billItem.update({
                where: { id: itemId },
                data: { returnedQuantity: { increment: returnQty } }
            })

            // 2. Update Product Stock
            await tx.product.update({
                where: { id: billItem.productId },
                data: { quantity: { increment: returnQty } }
            })

            // 3. Check if all items in bill are returned
            const bill = await tx.bill.findUnique({
                where: { id: billItem.billId },
                include: { items: true }
            })

            if (bill) {
                const allReturned = bill.items.every(i => i.returnedQuantity >= i.quantity)
                const anyReturned = bill.items.some(i => i.returnedQuantity > 0)

                let newStatus = bill.status
                if (allReturned) newStatus = 'RETURNED'
                else if (anyReturned) newStatus = 'PARTIAL'

                if (newStatus !== bill.status) {
                    await tx.bill.update({
                        where: { id: bill.id },
                        data: { status: newStatus }
                    })
                }
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to return item:', error)
        return { success: false, error: 'Failed to return item' }
    }
}

export async function deleteBill(billId: number) {
    try {
        await prisma.$transaction(async (tx) => {
            const bill = await tx.bill.findUnique({
                where: { id: billId },
                include: { items: true }
            })

            if (!bill) throw new Error('Bill not found')

            // Restore stock for items that haven't been returned
            // If the bill entire status is RETURNED, we probably shouldn't restore again?
            // If status is RETURNED, stock was already restored.
            // If status is PARTIAL or PAID, we restore the non-returned amount.

            if (bill.status !== 'RETURNED') {
                for (const item of bill.items) {
                    const remainingQty = item.quantity - item.returnedQuantity
                    if (remainingQty > 0) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { quantity: { increment: remainingQty } }
                        })
                    }
                }
            }

            // Delete Bill Items first (cascade might handle it but good to be explicit or if cascade not set)
            // Actually Prisma cascade should handle it if relationship is set, but let's just delete the bill
            // If it fails, we know we need to delete items. Usually cascade is set.
            // Let's rely on cascade or standard delete. 
            // Better to delete items explicitly if unsure about schema.
            // Checking typical Prisma usage, `onDelete: Cascade` logic handles it. 
            // Assuming schema has it. If not, this might fail. Safe bet: delete items first.
            await tx.billItem.deleteMany({
                where: { billId: bill.id }
            })

            await tx.bill.delete({
                where: { id: billId }
            })
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete bill:', error)
        return { success: false, error: 'Failed to delete bill' }
    }
}
