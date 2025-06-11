// متغیرهای سراسری
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let currentEditId = null;
let currentFilter = 'all';
let currentView = 'grid';
let searchTerm = '';

// عناصر DOM
const notesGrid = document.getElementById('notesGrid');
const noteModal = document.getElementById('noteModal');
const noteForm = document.getElementById('noteForm');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const modalTitle = document.getElementById('modalTitle');

// بارگذاری اولیه
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// راه‌اندازی اولیه برنامه
function initializeApp() {
    renderNotes();
    setupEventListeners();
    updateEmptyState();
}

// تنظیم Event Listeners
function setupEventListeners() {
    // جستجو
    searchInput.addEventListener('input', handleSearch);
    
    // فیلترها
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
    
    // تغییر نمای نمایش
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', handleViewChange);
    });
    
    // فرم یادداشت
    noteForm.addEventListener('submit', handleFormSubmit);
    
    // انتخابگر رنگ پیش‌فرض
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            document.getElementById('noteColor').value = color;
        });
    });
    
    // بستن مودال با کلیک خارج از آن
    noteModal.addEventListener('click', function(e) {
        if (e.target === noteModal) {
            closeModal();
        }
    });
    
    // کلیدهای میانبر
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // ورودی فایل برای import
    document.getElementById('fileInput').addEventListener('change', handleFileImport);
}

// باز کردن مودال
function openModal(editId = null) {
    currentEditId = editId;
    noteModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    if (editId) {
        // حالت ویرایش
        const note = notes.find(n => n.id === editId);
        if (note) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> ویرایش یادداشت';
            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteCategory').value = note.category;
            document.getElementById('noteTags').value = note.tags.join(', ');
            document.getElementById('noteContent').value = note.content;
            document.getElementById('noteColor').value = note.color || '#3498db';
        }
    } else {
        // حالت ایجاد جدید
        modalTitle.innerHTML = '<i class="fas fa-plus"></i> یادداشت جدید';
        noteForm.reset();
        document.getElementById('noteColor').value = '#3498db';
    }
    
    // فوکوس روی عنوان
    setTimeout(() => {
        document.getElementById('noteTitle').focus();
    }, 100);
}

// بستن مودال
function closeModal() {
    noteModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
    noteForm.reset();
}

// مدیریت ارسال فرم
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(noteForm);
    const noteData = {
        id: currentEditId || generateId(),
        title: document.getElementById('noteTitle').value.trim(),
        content: document.getElementById('noteContent').value.trim(),
        category: document.getElementById('noteCategory').value,
        tags: document.getElementById('noteTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0),
        color: document.getElementById('noteColor').value,
        createdAt: currentEditId ? 
            notes.find(n => n.id === currentEditId).createdAt : 
            new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: currentEditId ? 
            notes.find(n => n.id === currentEditId).pinned || false : 
            false
    };
    
    // اعتبارسنجی
    if (!noteData.title || !noteData.content) {
        showNotification('لطفاً عنوان و متن یادداشت را وارد کنید.', 'error');
        return;
    }
    
    if (currentEditId) {
        // ویرایش یادداشت موجود
        const index = notes.findIndex(n => n.id === currentEditId);
        if (index !== -1) {
            notes[index] = noteData;
            showNotification('یادداشت با موفقیت ویرایش شد.', 'success');
        }
    } else {
        // ایجاد یادداشت جدید
        notes.unshift(noteData);
        showNotification('یادداشت جدید ایجاد شد.', 'success');
    }
    
    saveNotes();
    renderNotes();
    closeModal();
}

// تولید ID یکتا
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ذخیره یادداشت‌ها در localStorage
function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// نمایش یادداشت‌ها
function renderNotes() {
    const filteredNotes = getFilteredNotes();
    
    if (filteredNotes.length === 0) {
        notesGrid.innerHTML = '';
        updateEmptyState();
        return;
    }
    
    // مرتب‌سازی: ابتدا سنجاق شده‌ها، سپس بر اساس تاریخ
    filteredNotes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    
    notesGrid.innerHTML = filteredNotes.map(note => createNoteCard(note)).join('');
    updateEmptyState();
    
    // اضافه کردن event listeners به کارت‌ها
    addNoteCardListeners();
}

// ایجاد کارت یادداشت
function createNoteCard(note) {
    const createdDate = new Date(note.createdAt).toLocaleDateString('fa-IR');
    const updatedDate = new Date(note.updatedAt).toLocaleDateString('fa-IR');
    const isUpdated = note.createdAt !== note.updatedAt;
    
    const tagsHtml = note.tags.length > 0 ? 
        `<div class="note-tags">
            ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>` : '';
    
    const categoryText = getCategoryText(note.category);
    
    return `
        <div class="note-card ${note.pinned ? 'pinned' : ''}" 
             data-id="${note.id}" 
             data-category="${note.category}"
             style="--category-color: ${note.color}">
            <div class="note-header">
                <div>
                    <h3 class="note-title">${escapeHtml(note.title)}</h3>
                    <span class="note-category ${note.category}">${categoryText}</span>
                </div>
                <div class="note-actions">
                    <button class="action-btn pin-btn" onclick="togglePin('${note.id}')" 
                            title="${note.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}">
                        <i class="fas fa-thumbtack ${note.pinned ? 'pinned' : ''}"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="openModal('${note.id}')" title="ویرایش">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteNote('${note.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="note-content">${formatContent(note.content)}</div>
            
            ${tagsHtml}
            
            <div class="note-footer">
                <span>ایجاد: ${createdDate}</span>
                ${isUpdated ? `<span>ویرایش: ${updatedDate}</span>` : ''}
            </div>
        </div>
    `;
}

// اضافه کردن event listeners به کارت‌های یادداشت
function addNoteCardListeners() {
    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // اگر روی دکمه‌های عملیات کلیک نشده باشد، یادداشت را ویرایش کن
            if (!e.target.closest('.note-actions')) {
                const noteId = this.getAttribute('data-id');
                openModal(noteId);
            }
        });
    });
}

// فرمت کردن محتوای یادداشت
function formatContent(content) {
    // تبدیل خطوط جدید به <br>
    let formatted = escapeHtml(content).replace(/\n/g, '<br>');
    
    // هایلایت کردن لینک‌ها
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    
    // محدود کردن طول متن در نمای کارت
    if (formatted.length > 200) {
        formatted = formatted.substring(0, 200) + '...';
    }
    
    return formatted;
}

// escape کردن HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// دریافت متن دسته‌بندی
function getCategoryText(category) {
    const categories = {
        'personal': 'شخصی',
        'work': 'کاری',
        'important': 'مهم',
        'ideas': 'ایده‌ها'
    };
    return categories[category] || category;
}

// تغییر وضعیت سنجاق
function togglePin(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.pinned = !note.pinned;
        note.updatedAt = new Date().toISOString();
        saveNotes();
        renderNotes();
        showNotification(
            note.pinned ? 'یادداشت سنجاق شد.' : 'سنجاق یادداشت برداشته شد.',
            'success'
        );
    }
}

// حذف یادداشت
function deleteNote(noteId) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این یادداشت را حذف کنید؟')) {
        notes = notes.filter(n => n.id !== noteId);
        saveNotes();
        renderNotes();
        showNotification('یادداشت حذف شد.', 'success');
    }
}

// مدیریت جستجو
function handleSearch(e) {
    searchTerm = e.target.value.toLowerCase().trim();
    renderNotes();
}

// مدیریت فیلتر
function handleFilter(e) {
    // حذف کلاس active از همه دکمه‌ها
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // اضافه کردن کلاس active به دکمه کلیک شده
    e.target.classList.add('active');
    
    currentFilter = e.target.getAttribute('data-filter');
    renderNotes();
}

// مدیریت تغییر نمای نمایش
function handleViewChange(e) {
    // حذف کلاس active از همه دکمه‌ها
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // اضافه کردن کلاس active به دکمه کلیک شده
    e.target.classList.add('active');
    
    currentView = e.target.getAttribute('data-view');
    
    // حذف کلاس‌های قبلی
    notesGrid.classList.remove('grid-view', 'list-view', 'masonry-view');
    
    // اضافه کردن کلاس جدید
    notesGrid.classList.add(`${currentView}-view`);
}

// دریافت یادداشت‌های فیلتر شده
function getFilteredNotes() {
    return notes.filter(note => {
        // فیلتر بر اساس دسته‌بندی
        const categoryMatch = currentFilter === 'all' || 
                            (currentFilter === 'pinned' ? note.pinned : note.category === currentFilter);
        
        // فیلتر بر اساس جستجو
        const searchMatch = !searchTerm || 
                          note.title.toLowerCase().includes(searchTerm) ||
                          note.content.toLowerCase().includes(searchTerm) ||
                          note.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        return categoryMatch && searchMatch;
    });
}
// به‌روزرسانی وضعیت خالی
function updateEmptyState() {
    const filteredNotes = getFilteredNotes();
    
    if (filteredNotes.length === 0) {
        if (notes.length === 0) {
            emptyState.innerHTML = `
                <i class="fas fa-clipboard"></i>
                <p>هنوز یادداشتی ندارید. اولین یادداشت خود را ایجاد کنید!</p>
                <button class="btn btn-primary" onclick="openModal()">
                    <i class="fas fa-plus"></i> یادداشت جدید
                </button>
            `;
        } else {
            emptyState.innerHTML = `
                <i class="fas fa-search"></i>
                <p>یادداشتی با این فیلتر یافت نشد.</p>
                <button class="btn btn-secondary" onclick="clearFilters()">
                    <i class="fas fa-times"></i> پاک کردن فیلترها
                </button>
            `;
        }
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

// پاک کردن فیلترها
function clearFilters() {
    // پاک کردن جستجو
    searchInput.value = '';
    searchTerm = '';
    
    // تنظیم فیلتر روی "همه"
    currentFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === 'all') {
            btn.classList.add('active');
        }
    });
    
    renderNotes();
}

// مدیریت کلیدهای میانبر
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + N: یادداشت جدید
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
    
    // Escape: بستن مودال
    if (e.key === 'Escape' && noteModal.style.display === 'block') {
        closeModal();
    }
    
    // Ctrl/Cmd + F: فوکوس روی جستجو
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Ctrl/Cmd + S: ذخیره فرم (اگر مودال باز است)
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && noteModal.style.display === 'block') {
        e.preventDefault();
        noteForm.dispatchEvent(new Event('submit'));
    }
}

// خروجی گرفتن از یادداشت‌ها
function exportNotes() {
    if (notes.length === 0) {
        showNotification('یادداشتی برای خروجی وجود ندارد.', 'warning');
        return;
    }
    
    const exportData = {
        notes: notes,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('فایل پشتیبان با موفقیت دانلود شد.', 'success');
}

// ورودی یادداشت‌ها
function importNotes() {
    document.getElementById('fileInput').click();
}

// مدیریت ورودی فایل
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json') {
        showNotification('لطفاً فایل JSON معتبر انتخاب کنید.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importData = JSON.parse(event.target.result);
            
            // اعتبارسنجی ساختار فایل
            if (!importData.notes || !Array.isArray(importData.notes)) {
                throw new Error('ساختار فایل نامعتبر است.');
            }
            
            // تأیید از کاربر
            const confirmMessage = `آیا مطمئن هستید که می‌خواهید ${importData.notes.length} یادداشت را وارد کنید؟\n\nتوجه: این عمل یادداشت‌های فعلی را جایگزین می‌کند.`;
            
            if (confirm(confirmMessage)) {
                // اضافه کردن ID جدید به یادداشت‌های وارد شده تا تداخل نداشته باشند
                const importedNotes = importData.notes.map(note => ({
                    ...note,
                    id: generateId(),
                    importedAt: new Date().toISOString()
                }));
                
                notes = [...importedNotes, ...notes];
                saveNotes();
                renderNotes();
                
                showNotification(`${importedNotes.length} یادداشت با موفقیت وارد شد.`, 'success');
            }
        } catch (error) {
            console.error('خطا در وارد کردن فایل:', error);
            showNotification('خطا در وارد کردن فایل. لطفاً فایل معتبر انتخاب کنید.', 'error');
        }
    };
    
    reader.readAsText(file);
    
    // پاک کردن مقدار input برای امکان انتخاب مجدد همان فایل
    e.target.value = '';
}

// نمایش اعلان
function showNotification(message, type = 'info') {
    // حذف اعلان‌های قبلی
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // ایجاد اعلان جدید
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // اضافه کردن استایل‌های اعلان
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        margin-right: auto;
    `;
    
    document.body.appendChild(notification);
    
    // انیمیشن ورود
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // حذف خودکار بعد از 5 ثانیه
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// دریافت آیکون اعلان
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// دریافت رنگ اعلان
function getNotificationColor(type) {
    const colors = {
        'success': '#27ae60',
        'error': '#e74c3c',
        'warning': '#f39c12',
        'info': '#3498db'
    };
    return colors[type] || '#3498db';
}

// تابع جستجوی پیشرفته
function advancedSearch(query) {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return notes.filter(note => {
        const searchableText = [
            note.title,
            note.content,
            note.category,
            ...note.tags
        ].join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
    });
}

// مرتب‌سازی یادداشت‌ها
function sortNotes(criteria) {
    const sortedNotes = [...notes];
    
    switch (criteria) {
        case 'date-desc':
            sortedNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            break;
        case 'date-asc':
            sortedNotes.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
            break;
        case 'title-asc':
            sortedNotes.sort((a, b) => a.title.localeCompare(b.title, 'fa'));
            break;
        case 'title-desc':
            sortedNotes.sort((a, b) => b.title.localeCompare(a.title, 'fa'));
            break;
        case 'category':
            sortedNotes.sort((a, b) => a.category.localeCompare(b.category));
            break;
    }
    
    notes = sortedNotes;
    renderNotes();
}

// آمار یادداشت‌ها
function getNotesStats() {
    const stats = {
        total: notes.length,
        pinned: notes.filter(n => n.pinned).length,
        categories: {},
        totalTags: new Set()
    };
    
    notes.forEach(note => {
        // شمارش دسته‌بندی‌ها
        stats.categories[note.category] = (stats.categories[note.category] || 0) + 1;
        
        // جمع‌آوری برچسب‌ها
        note.tags.forEach(tag => stats.totalTags.add(tag));
    });
    
    stats.uniqueTags = stats.totalTags.size;
    
    return stats;
}

// نمایش آمار (اختیاری)
function showStats() {
    const stats = getNotesStats();
    const message = `
آمار یادداشت‌ها:
• کل یادداشت‌ها: ${stats.total}
• سنجاق شده: ${stats.pinned}
• برچسب‌های منحصر به فرد: ${stats.uniqueTags}
• دسته‌بندی‌ها: ${Object.entries(stats.categories).map(([cat, count]) => `${getCategoryText(cat)}: ${count}`).join(', ')}
    `;
    
    alert(message);
}

// پاک کردن تمام یادداشت‌ها
function clearAllNotes() {
    if (notes.length === 0) {
        showNotification('یادداشتی برای حذف وجود ندارد.', 'warning');
        return;
    }
    
    const confirmMessage = `آیا مطمئن هستید که می‌خواهید تمام ${notes.length} یادداشت را حذف کنید؟\n\nاین عمل قابل بازگشت نیست!`;
    
    if (confirm(confirmMessage)) {
        notes = [];
        saveNotes();
        renderNotes();
        showNotification('تمام یادداشت‌ها حذف شدند.', 'success');
    }
}

// بک‌آپ خودکار (هر 5 دقیقه)
function setupAutoBackup() {
    setInterval(() => {
        if (notes.length > 0) {
            localStorage.setItem('notes-auto-backup', JSON.stringify({
                notes: notes,
                timestamp: new Date().toISOString()
            }));
        }
    }, 5 * 60 * 1000); // 5 دقیقه
}

// بازیابی از بک‌آپ خودکار
function restoreFromAutoBackup() {
    const backup = localStorage.getItem('notes-auto-backup');
    if (backup) {
        try {
            const backupData = JSON.parse(backup);
            const backupDate = new Date(backupData.timestamp).toLocaleString('fa-IR');
            
            if (confirm(`بک‌آپ خودکار از تاریخ ${backupDate} یافت شد. آیا می‌خواهید آن را بازیابی کنید؟`)) {
                notes = backupData.notes;
                saveNotes();
                renderNotes();
                showNotification('یادداشت‌ها از بک‌آپ خودکار بازیابی شدند.', 'success');
            }
        } catch (error) {
            console.error('خطا در بازیابی بک‌آپ خودکار:', error);
        }
    } else {
        showNotification('بک‌آپ خودکاری یافت نشد.', 'warning');
    }
}

// راه‌اندازی بک‌
