'use client'

import { useEffect, useState } from 'react'
import { getSalesReport, ReportType, saveMonthlySnapshot, getMonthlySnapshots } from '@/app/actions/report'
import * as XLSX from 'xlsx'
import { Calendar, DollarSign, TrendingUp, Package, Save, FileText, Download, ChevronDown, ChevronUp } from 'lucide-react'

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
        productBreakdown?: any[]
    } | null>(null)
    const [savedReports, setSavedReports] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showSaved, setShowSaved] = useState(false)

    useEffect(() => {
        fetchReport()
    }, [activeTab, currentDate])

    useEffect(() => {
        loadSavedReports()
    }, [])

    async function loadSavedReports() {
        const res = await getMonthlySnapshots()
        if (res.success && res.data) {
            setSavedReports(res.data)
        }
    }

    async function fetchReport() {
        setLoading(true)
        const res = await getSalesReport(currentDate, activeTab)
        if (res.success && res.data) {
            setReportData(res.data)
        }
        setLoading(false)
    }

    async function handleSaveSnapshot() {
        if (activeTab !== 'monthly' || !reportData) return
        if (!confirm(`Save snapshot for ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}?`)) return

        const month = currentDate.getMonth() + 1
        const year = currentDate.getFullYear()

        const res = await saveMonthlySnapshot(month, year, {
            totalSales: reportData.totalSales,
            totalProfit: reportData.profit,
            totalReturns: reportData.returnedAmount
        })

        if (res.success) {
            alert('Monthly report saved successfully!')
            loadSavedReports()
        } else {
            alert('Failed to save report.')
        }
    }

    function handleExport() {
        if (!reportData || !reportData.bills) return

        // Sheet 1: Summary
        const summaryData = [
            { Metric: 'Period', Value: activeTab.toUpperCase() },
            { Metric: 'Date', Value: currentDate.toLocaleDateString() },
            { Metric: 'Total Sales (Net)', Value: reportData.totalSales },
            { Metric: 'Returns', Value: reportData.returnedAmount },
            { Metric: 'Product Value (Cost)', Value: reportData.productValue },
            { Metric: 'Profit', Value: reportData.profit },
        ]

        // Sheet 2: Detailed Sales (Bills)
        const billData = reportData.bills.map(bill => ({
            'Bill ID': bill.id,
            'Date': new Date(bill.createdAt).toLocaleDateString(),
            'Customer': bill.customerName,
            'Total Amount': bill.totalAmount,
            'Items Count': bill.items.length,
            'Status': bill.status
        }))

        // Sheet 3: Product Performance
        const productData = reportData.productBreakdown?.map(p => ({
            'Product': p.name,
            'Qty Sold': p.quantity,
            'Qty Returned': p.returned,
            'Net Revenue': p.revenue,
            'Cost': p.cost,
            'Profit': p.profit
        })) || []

        const wb = XLSX.utils.book_new()

        const wsSummary = XLSX.utils.json_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

        const wsBills = XLSX.utils.json_to_sheet(billData)
        XLSX.utils.book_append_sheet(wb, wsBills, "Bills")

        const wsProducts = XLSX.utils.json_to_sheet(productData)
        XLSX.utils.book_append_sheet(wb, wsProducts, "Product Performance")

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
        <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Sales Report</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Track your business performance</p>
                </div>
                {/* Saved Reports Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSaved(!showSaved)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <HistoryIcon /> Saved Reports {showSaved ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showSaved && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 p-2 max-h-64 overflow-y-auto">
                            {savedReports.length === 0 ? (
                                <div className="p-4 text-center text-sm text-zinc-500">No saved reports</div>
                            ) : (
                                savedReports.map((report: any) => (
                                    <div key={report.id} className="p-3 border-b border-zinc-100 dark:border-zinc-700 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-lg">
                                        <p className="font-bold text-sm text-zinc-900 dark:text-white">
                                            {new Date(report.year, report.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </p>
                                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                                            <span>Sales: {report.totalSales.toLocaleString()}</span>
                                            <span className="text-green-600">Profit: {report.totalProfit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                    {(['daily', 'weekly', 'monthly'] as ReportType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-md capitalize text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-white dark:bg-zinc-700 shadow text-blue-600 dark:text-blue-400'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-6 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <button onClick={handlePrev} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                        <ChevronDown className="rotate-90" size={20} />
                    </button>
                    <div className="flex items-center gap-2 font-bold text-lg min-w-[200px] justify-center">
                        <Calendar className="w-5 h-5 text-zinc-400" />
                        {activeTab === 'daily' && currentDate.toLocaleDateString()}
                        {activeTab === 'weekly' && `Week of ${currentDate.toLocaleDateString()}`}
                        {activeTab === 'monthly' && currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={handleNext} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                        <ChevronDown className="-rotate-90" size={20} />
                    </button>
                </div>

                <div className="flex gap-2">
                    {activeTab === 'monthly' && (
                        <button
                            onClick={handleSaveSnapshot}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-sm font-medium transition-colors"
                        >
                            <Save size={18} /> Save Closing
                        </button>
                    )}
                    <button
                        onClick={handleExport}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm font-medium transition-colors"
                    >
                        <Download size={18} /> Export Excel
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Sales"
                    value={reportData?.totalSales}
                    loading={loading}
                    icon={<DollarSign className="w-6 h-6 text-blue-500" />}
                    color="text-blue-600"
                    trend="+12%" // improved: calculated trend could be added
                />
                <MetricCard
                    title="Returns"
                    value={reportData?.returnedAmount}
                    loading={loading}
                    icon={<div className="text-red-500 font-bold text-xl">↺</div>}
                    color="text-red-600"
                />
                <MetricCard
                    title="Product Cost"
                    value={reportData?.productValue}
                    loading={loading}
                    icon={<Package className="w-6 h-6 text-orange-500" />}
                    color="text-orange-600"
                />
                <MetricCard
                    title="Net Profit"
                    value={reportData?.profit}
                    loading={loading}
                    icon={<TrendingUp className="w-6 h-6 text-green-500" />}
                    color="text-green-600"
                    bg="bg-green-50 dark:bg-green-900/20"
                />
            </div>

            {/* Product Performance Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-zinc-400" />
                        Product Performance
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
                            <tr>
                                <th className="px-6 py-3">Product Name</th>
                                <th className="px-6 py-3 text-center">Sold</th>
                                <th className="px-6 py-3 text-center">Returned</th>
                                <th className="px-6 py-3 text-right">Revenue</th>
                                <th className="px-6 py-3 text-right">Cost</th>
                                <th className="px-6 py-3 text-right">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Loading data...</td>
                                </tr>
                            ) : !reportData?.productBreakdown || reportData.productBreakdown.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No sales data for this period.</td>
                                </tr>
                            ) : (
                                reportData.productBreakdown.map((item: any, idx: number) => (
                                    <tr key={idx} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{item.name}</td>
                                        <td className="px-6 py-4 text-center text-zinc-600 dark:text-zinc-400">{item.quantity}</td>
                                        <td className="px-6 py-4 text-center text-red-500">{item.returned > 0 ? item.returned : '-'}</td>
                                        <td className="px-6 py-4 text-right font-medium">{item.revenue.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-zinc-500">{item.cost.toFixed(2)}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.profit.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, loading, icon, color, bg }: any) {
    return (
        <div className={`p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-md bg-white dark:bg-zinc-900 ${bg || ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wide">{title}</h3>
                    {loading ? (
                        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded mt-2"></div>
                    ) : (
                        <p className={`text-3xl font-extrabold mt-2 ${color}`}>
                            {value?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? 0}
                            <span className="text-sm font-normal text-zinc-400 ml-1">Rs</span>
                        </p>
                    )}
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                    {icon}
                </div>
            </div>
        </div>
    )
}

function HistoryIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /></svg>
    )
}
