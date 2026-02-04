'use client'

import { useEffect, useState } from 'react'
import { getSalesReport, ReportType } from '@/app/actions/report'
import * as XLSX from 'xlsx'
import { Calendar, DollarSign, TrendingUp, Package } from 'lucide-react'

export default function ReportPage() {
    const [activeTab, setActiveTab] = useState<ReportType>('daily')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [reportData, setReportData] = useState<{
        totalSales: number
        productValue: number
        returnedAmount: number
        profit: number
        billCount: number
        bills: any[]
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReport()
    }, [activeTab, currentDate])

    async function fetchReport() {
        setLoading(true)
        const res = await getSalesReport(currentDate, activeTab)
        if (res.success && res.data) {
            setReportData(res.data)
        }
        setLoading(false)
    }

    function handleExport() {
        if (!reportData || !reportData.bills) return

        // Flatten data for export
        const exportData = reportData.bills.map(bill => ({
            'Bill ID': bill.id,
            'Date': new Date(bill.createdAt).toLocaleDateString(),
            'Customer': bill.customerName,
            'Total Amount': bill.totalAmount,
            'Items Count': bill.items.length,
            // We could add more details or separate sheet for items
        }))

        // Create detailed items export if needed, but for now simple bill list
        // Or maybe a detailed export with one row per item?
        const detailedData = reportData.bills.flatMap(bill =>
            bill.items.map((item: any) => ({
                'Bill ID': bill.id,
                'Date': new Date(bill.createdAt).toLocaleDateString(),
                'Customer': bill.customerName,
                'Product': item.productName,
                'Quantity': item.quantity,
                'Sale Price': item.price,
                'Purchase Price': item.purchasePrice,
                'Total': item.total,
                'Profit': item.total - (item.purchasePrice * item.quantity)
            }))
        )

        const wb = XLSX.utils.book_new()

        // Sheet 1: Summary
        const summaryData = [
            { Metric: 'Period', Value: activeTab.toUpperCase() },
            { Metric: 'Date', Value: currentDate.toLocaleDateString() },
            { Metric: 'Total Sales (Net)', Value: reportData.totalSales },
            { Metric: 'Returns', Value: reportData.returnedAmount },
            { Metric: 'Product Value (Cost)', Value: reportData.productValue },
            { Metric: 'Profit', Value: reportData.profit },
        ]
        const wsSummary = XLSX.utils.json_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

        // Sheet 2: Detailed Sales
        const wsDetail = XLSX.utils.json_to_sheet(detailedData)
        XLSX.utils.book_append_sheet(wb, wsDetail, "Detailed Sales")

        XLSX.writeFile(wb, `Sales_Report_${activeTab}_${currentDate.toISOString().split('T')[0]}.xlsx`)
    }

    function handlePrev() {
        const newDate = new Date(currentDate)
        if (activeTab === 'daily') newDate.setDate(newDate.getDate() - 1)
        if (activeTab === 'weekly') newDate.setDate(newDate.getDate() - 7)
        if (activeTab === 'monthly') newDate.setMonth(newDate.getMonth() - 1)
        setCurrentDate(newDate)
    }

    function handleNext() {
        const newDate = new Date(currentDate)
        if (activeTab === 'daily') newDate.setDate(newDate.getDate() + 1)
        if (activeTab === 'weekly') newDate.setDate(newDate.getDate() + 7)
        if (activeTab === 'monthly') newDate.setMonth(newDate.getMonth() + 1)
        setCurrentDate(newDate)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Sales Report</h1>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow">
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {(['daily', 'weekly', 'monthly'] as ReportType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md capitalize ${activeTab === tab ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handlePrev} className="p-2 hover:bg-gray-100 rounded-full">
                        ←
                    </button>
                    <div className="flex items-center gap-2 font-medium">
                        <Calendar className="w-5 h-5" />
                        {activeTab === 'daily' && currentDate.toLocaleDateString()}
                        {activeTab === 'weekly' && `Week of ${currentDate.toLocaleDateString()}`}
                        {activeTab === 'monthly' && currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={handleNext} className="p-2 hover:bg-gray-100 rounded-full">
                        →
                    </button>
                </div>

                <button
                    onClick={handleExport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                    Export to Excel
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Sales"
                    value={reportData?.totalSales}
                    loading={loading}
                    icon={<DollarSign className="w-8 h-8 text-blue-500" />}
                    color="text-blue-600"
                />
                <MetricCard
                    title="Returns"
                    value={reportData?.returnedAmount}
                    loading={loading}
                    icon={<div className="text-red-500 font-bold">↺</div>}
                    color="text-red-600"
                />
                <MetricCard
                    title="Profit"
                    value={reportData?.profit}
                    loading={loading}
                    icon={<TrendingUp className="w-8 h-8 text-green-500" />}
                    color="text-green-600"
                />
                <MetricCard
                    title="Product Value (Cost)"
                    value={reportData?.productValue}
                    loading={loading}
                    icon={<Package className="w-8 h-8 text-orange-500" />}
                    color="text-orange-600"
                />
            </div>
        </div>
    )
}

function MetricCard({ title, value, loading, icon, color }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                    {loading ? (
                        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
                    ) : (
                        <p className={`text-3xl font-bold mt-1 ${color}`}>
                            Rs. {value?.toLocaleString() ?? 0}
                        </p>
                    )}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                    {icon}
                </div>
            </div>
        </div>
    )
}
