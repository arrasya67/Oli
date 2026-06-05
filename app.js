/**
 * UWITracker - Core Application Logic
 * Powered by Alpine.js & Chart.js
 */

function oliApp() {
    return {
        activeTab: 'beranda',
        chartTab: 'pie',
        darkMode: localStorage.getItem('darkMode') === 'true',
        showModal: false,
        isEditMode: false,
        editIndex: null,
        activeFilter: 'Semua',

        pieChartInstance: null,
        barChartInstance: null,

        cachedKategoriData: { 'Oli Mesin': 0, 'Oli Gardan': 0, 'Servis & Lainnya': 0 },
        cachedBulananData: Array(12).fill(0),

        bulanTerborosNama: '-',
        bulanTerborosBiaya: 0,
        rataRataBiaya: 0,
        servisTermahalNama: '-',
        servisTermahalBiaya: 0,

        selectedMonth: new Date().getMonth(),
        selectedYear: new Date().getFullYear(),
        availableYears: [new Date().getFullYear()],
        monthsFull: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
        
        history: JSON.parse(localStorage.getItem('oli_history') || '[]'),
        currentOdo: localStorage.getItem('last_odo') || 0,
        targetKm: 0,
        sisaKm: 0,
        progress: 0,
        totalBiaya: 0,
        biayaBulanTerpilih: 0,
        biayaTahunTerpilih: 0,
        formData: { jenis: 'Oli Mesin', merk: '', km: '', harga: '', tanggal: new Date().toISOString().split('T')[0], bengkel: '', catatan: '' },

                init() {
                    this.applyTheme();
                    this.calculateDashboard();
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.register('./sw.js').catch(() => {});
                    }
                },

                toggleDarkMode() {
                    this.darkMode = !this.darkMode;
                    localStorage.setItem('darkMode', this.darkMode);
                    this.applyTheme();
                    if (this.activeTab === 'analisis') {
                        this.triggerChartRender();
                    }
                },

                applyTheme() {
                    if (this.darkMode) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                },

                openAddModal() {
                    this.isEditMode = false;
                    this.editIndex = null;
                    this.formData = { jenis: 'Oli Mesin', merk: '', km: '', harga: '', tanggal: new Date().toISOString().split('T')[0], bengkel: '', catatan: '' };
                    this.showModal = true;
                },

                openEditModal(index) {
                    this.isEditMode = true;
                    this.editIndex = index;
                    this.formData = { ...this.history[index] };
                    this.showModal = true;
                },

                saveEntry() {
                    if(!this.formData.merk) return alert('Mohon lengkapi nama barang/servis!');
                    if(this.formData.jenis !== 'Servis & Lainnya' && !this.formData.km) return alert('Mohon masukkan kilometer motor saat ini!');
                    
                    const entryData = {
                        jenis: this.formData.jenis,
                        merk: this.formData.merk,
                        km: this.formData.jenis === 'Servis & Lainnya' ? (parseInt(this.formData.km) || 0) : parseInt(this.formData.km),
                        harga: parseInt(this.formData.harga) || 0,
                        tanggal: this.formData.tanggal,
                        bengkel: this.formData.bengkel || '',
                        catatan: this.formData.catatan || ''
                    };

                    if (this.isEditMode) {
                        this.history[this.editIndex] = entryData;
                    } else {
                        this.history.unshift(entryData);
                    }
                    
                    if(entryData.km > this.currentOdo && this.formData.jenis !== 'Servis & Lainnya') {
                        this.currentOdo = entryData.km;
                    }
                    
                    this.updateStorage();
                    this.showModal = false;
                },

                deleteEntry(index) {
                    if(confirm('Hapus catatan riwayat ini?')) {
                        this.history.splice(index, 1);
                        this.updateStorage();
                    }
                },

                updateStorage() {
                    localStorage.setItem('oli_history', JSON.stringify(this.history));
                    localStorage.setItem('last_odo', this.currentOdo);
                    this.calculateDashboard();
                },

                calculateDashboard() {
                    const lastOliMesin = this.history.find(item => item.jenis === 'Oli Mesin');

                    if (lastOliMesin) {
                        const odoNow = parseInt(this.currentOdo) || lastOliMesin.km;
                        this.targetKm = lastOliMesin.km + 2000;
                        this.sisaKm = this.targetKm - odoNow;
                        
                        const jarakTerpakai = odoNow - lastOliMesin.km;
                        let persenMaju = (jarakTerpakai / 2000) * 100;
                        
                        if (persenMaju > 100) persenMaju = 100;
                        if (persenMaju < 0) persenMaju = 0;
                        
                        this.progress = persenMaju;
                    } else {
                        this.targetKm = 0; this.sisaKm = 0; this.progress = 0;
                    }
                    localStorage.setItem('last_odo', this.currentOdo);

                    const uniqueYears = [new Date().getFullYear()];
                    this.history.forEach(item => {
                        if (item.tanggal) {
                            const yr = new Date(item.tanggal).getFullYear();
                            if (!uniqueYears.includes(yr)) uniqueYears.push(yr);
                        }
                    });
                    this.availableYears = uniqueYears.sort((a, b) => b - a);

                    const filterYear = parseInt(this.selectedYear);
                    const filterMonth = parseInt(this.selectedMonth);

                    this.totalBiaya = 0;
                    this.biayaBulanTerpilih = 0;
                    this.biayaTahunTerpilih = 0;

                    this.cachedKategoriData = { 'Oli Mesin': 0, 'Oli Gardan': 0, 'Servis & Lainnya': 0 };
                    this.cachedBulananData = Array(12).fill(0);

                    let tempMaxServisBiaya = 0;
                    let tempMaxServisNama = '-';

                    this.history.forEach(item => {
                        const hargaItem = parseInt(item.harga) || 0;
                        this.totalBiaya += hargaItem;

                        if (item.tanggal) {
                            const tanggalItem = new Date(item.tanggal);
                            const itemYear = tanggalItem.getFullYear();
                            const itemMonth = tanggalItem.getMonth();

                            if (itemYear === filterYear) {
                                this.biayaTahunTerpilih += hargaItem;
                                this.cachedBulananData[itemMonth] += hargaItem;

                                if (itemMonth === filterMonth) {
                                    this.biayaBulanTerpilih += hargaItem;
                                }

                                if (hargaItem > tempMaxServisBiaya) {
                                    tempMaxServisBiaya = hargaItem;
                                    tempMaxServisNama = item.merk;
                                }
                            }
                            if (this.cachedKategoriData[item.jenis] !== undefined) {
                                this.cachedKategoriData[item.jenis] += hargaItem;
                            }
                        }
                    });

                    let maxMonthCost = 0;
                    let maxMonthIdx = 0;
                    this.cachedBulananData.forEach((val, idx) => {
                        if (val > maxMonthCost) {
                            maxMonthCost = val;
                            maxMonthIdx = idx;
                        }
                    });
                    
                    this.bulanTerborosNama = maxMonthCost > 0 ? this.monthsFull[maxMonthIdx] : '-';
                    this.bulanTerborosBiaya = maxMonthCost;
                    this.rataRataBiaya = Math.round(this.biayaTahunTerpilih / 12);
                    this.servisTermahalNama = tempMaxServisNama;
                    this.servisTermahalBiaya = tempMaxServisBiaya;

                    if (this.activeTab === 'analisis') {
                        this.triggerChartRender();
                    }
                },

                triggerChartRender() {
                    this.$nextTick(() => {
                        this.renderCharts(this.cachedKategoriData, this.cachedBulananData);
                    });
                },

                renderCharts(kategoriData, bulananData) {
                    const isDark = this.darkMode;
                    const textThemeColor = isDark ? '#94a3b8' : '#64748b';

                    if (this.chartTab === 'pie') {
                        const ctxPie = document.getElementById('categoryChart');
                        if (ctxPie) {
                            if (this.pieChartInstance) this.pieChartInstance.destroy();
                            this.pieChartInstance = new Chart(ctxPie, {
                                type: 'pie',
                                data: {
                                    labels: ['Oli Mesin', 'Oli Gardan', 'Servis Umum'],
                                    datasets: [{
                                        data: [kategoriData['Oli Mesin'], kategoriData['Oli Gardan'], kategoriData['Servis & Lainnya']],
                                        backgroundColor: ['#2563eb', '#0d9488', '#8b5cf6'],
                                        borderWidth: isDark ? 2 : 1,
                                        borderColor: isDark ? '#0f172a' : '#ffffff'
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'bottom', labels: { color: textThemeColor, font: { family: 'Plus Jakarta Sans', weight: 'bold', size: 10 } } }
                                    }
                                }
                            });
                        }
                    }

                    if (this.chartTab === 'bar') {
                        const ctxBar = document.getElementById('trendChart');
                        if (ctxBar) {
                            if (this.barChartInstance) this.barChartInstance.destroy();
                            this.barChartInstance = new Chart(ctxBar, {
                                type: 'bar',
                                data: {
                                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                                    datasets: [{
                                        label: 'Pengeluaran (Rp)',
                                        data: bulananData,
                                        backgroundColor: '#3b82f6',
                                        borderRadius: 6
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: { grid: { display: false }, ticks: { color: textThemeColor, font: { family: 'Plus Jakarta Sans', size: 9 } } },
                                        y: { grid: { color: isDark ? '#334155' : '#f1f5f9' }, ticks: { color: textThemeColor, font: { family: 'Plus Jakarta Sans', size: 9 } } }
                                    }
                                }
                            });
                        }
                    }
                },

                formatNumber(num) {
                    return new Intl.NumberFormat('id-ID').format(num);
                },

                formatRupiah(num) {
                    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
                },

                formatDate(dateStr) {
                    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                }
    }
}