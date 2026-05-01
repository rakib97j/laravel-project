class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentTab = "list";
        this.currentModalTab = "assign";
        this.selectedTaskId = null;
        this.zoomLevel = 100;
        this.isDarkMode = false;
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.loadTasks();
        this.setupEventListeners();
        this.updateDate();
        this.renderTasks();
        this.updateStats();
        this.updateDocumentView();
        this.loadDarkMode();
        this.updateUserDisplay();
    }

    checkAuthentication() {
        const session =
            localStorage.getItem("userSession") ||
            sessionStorage.getItem("userSession");
        if (!session) {
            // Redirect to login if not authenticated
            window.location.href = "login.html";
            return;
        }

        try {
            this.currentUser = JSON.parse(session);
            const loginTime = new Date(this.currentUser.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

            if (hoursDiff > 24) {
                // Session expired, redirect to login
                this.logout();
                return;
            }
        } catch (error) {
            // Invalid session, redirect to login
            this.logout();
            return;
        }
    }

    updateUserDisplay() {
        if (this.currentUser) {
            // Update header with user info
            const header = document.querySelector("header");
            const userDisplay = document.createElement("div");
            userDisplay.className = "user-display";
            userDisplay.innerHTML = `
                <div class="user-info">
                    <span class="user-id">👤 ID: ${this.currentUser.userId}</span>
                    <span class="user-phone">📱 ${this.currentUser.phoneNumber}</span>
                    <button class="logout-btn" onclick="app.logout()">🚪 লগআউট</button>
                </div>
            `;
            header.appendChild(userDisplay);
        }
    }

    logout() {
        // Clear session
        localStorage.removeItem("userSession");
        sessionStorage.removeItem("userSession");

        // Clear user-specific data
        localStorage.removeItem("dailyTasks");

        // Redirect to login
        window.location.href = "login.html";
    }

    setupEventListeners() {
        document
            .getElementById("addTaskBtn")
            .addEventListener("click", () => this.addTask());
        document
            .getElementById("taskInput")
            .addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.addTask();
            });
        document
            .getElementById("clearCompletedBtn")
            .addEventListener("click", () => this.clearCompleted());
        document
            .getElementById("clearAllBtn")
            .addEventListener("click", () => this.clearAll());

        // Search and filter
        document
            .getElementById("searchInput")
            .addEventListener("input", (e) => this.searchTasks(e.target.value));
        document
            .getElementById("filterSelect")
            .addEventListener("change", (e) =>
                this.filterTasks(e.target.value),
            );

        // Tab switching
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.addEventListener("click", (e) =>
                this.switchTab(e.target.dataset.tab),
            );
        });

        // Modal tab switching
        document.querySelectorAll(".modal-tab-btn").forEach((btn) => {
            btn.addEventListener("click", (e) =>
                this.switchModalTab(e.target.dataset.modalTab),
            );
        });

        // Close modal on outside click
        window.addEventListener("click", (e) => {
            if (e.target.classList.contains("modal")) {
                if (e.target.id === "taskModal") {
                    this.closeModal();
                } else if (e.target.id === "documentModal") {
                    this.closeDocumentModal();
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case "d":
                        e.preventDefault();
                        this.toggleDarkMode();
                        break;
                    case "f":
                        e.preventDefault();
                        document.getElementById("searchInput").focus();
                        break;
                    case "n":
                        e.preventDefault();
                        document.getElementById("taskInput").focus();
                        break;
                }
            }
        });
    }

    loadDarkMode() {
        const darkMode = localStorage.getItem("darkMode");
        if (darkMode === "true") {
            this.isDarkMode = true;
            document.body.classList.add("dark-mode");
            document.getElementById("darkModeBtn").textContent = "☀️ লাইট মোড";
        }
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", this.isDarkMode);

        const btn = document.getElementById("darkModeBtn");
        btn.textContent = this.isDarkMode ? "☀️ লাইট মোড" : "🌙 ডার্ক মোড";

        this.showNotification(
            this.isDarkMode
                ? "🌙 ডার্ক মোড চালু হয়েছে"
                : "☀️ লাইট মোড চালু হয়েছে",
            "info",
        );
    }

    searchTasks(query) {
        const filteredTasks = this.getFilteredTasks().filter((task) =>
            task.text.toLowerCase().includes(query.toLowerCase()),
        );
        this.renderFilteredTasks(filteredTasks);
    }

    filterTasks(filter) {
        const query = document.getElementById("searchInput").value;
        const filteredTasks = this.getFilteredTasks(filter).filter((task) =>
            task.text.toLowerCase().includes(query.toLowerCase()),
        );
        this.renderFilteredTasks(filteredTasks);
    }

    getFilteredTasks(filter = document.getElementById("filterSelect").value) {
        switch (filter) {
            case "pending":
                return this.tasks.filter((t) => !t.completed && !t.rejected);
            case "completed":
                return this.tasks.filter((t) => t.completed);
            case "rejected":
                return this.tasks.filter((t) => t.rejected);
            default:
                return this.tasks;
        }
    }

    renderFilteredTasks(tasks) {
        const container = document.getElementById("taskContainer");

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>🔍 কোন কাজ পাওয়া যায়নি</h3>
                    <p>অন্য কিওয়ার্ড দিয়ে চেষ্টা করুন</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasks
            .map((task) => {
                const statusClass = task.completed
                    ? "completed"
                    : task.rejected
                      ? "rejected"
                      : "assigned";
                const categoryClass = `category-${task.category || "general"}`;
                const priorityClass = `priority-${task.priority || "medium"}`;
                const categoryText = this.getCategoryText(
                    task.category || "general",
                );

                return `
                <div class="task-item ${statusClass}">
                    <div class="task-content">
                        <input type="checkbox"
                               class="task-checkbox"
                               ${task.completed ? "checked" : ""}
                               onchange="app.toggleTask(${task.id})">
                        <span class="task-text">${this.escapeHtml(task.text)}</span>
                        <span class="task-category ${categoryClass}">${categoryText}</span>
                        <span class="task-priority ${priorityClass}" title="অগ্রাধিকার: ${this.getPriorityText(task.priority || "medium")}"></span>
                        <span class="task-time">
                            ${task.completed ? "✅ " : task.rejected ? "❌ " : ""}${this.formatTime(task.createdAt)}
                        </span>
                    </div>
                    <div class="task-actions">
                        <button class="action-btn" onclick="app.openTaskModal(${task.id})" title="কাজের বিবরণ">
                            📋
                        </button>
                        <button class="delete-btn" onclick="app.deleteTask(${task.id})" title="মুছুন">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    getCategoryText(category) {
        const categories = {
            general: "📝 সাধারণ",
            work: "💼 কাজ",
            personal: "👤 ব্যক্তিগত",
            urgent: "🚨 জরুরি",
            study: "📚 পড়াশোনা",
            health: "🏥 স্বাস্থ্য",
        };
        return categories[category] || "📝 সাধারণ";
    }

    getPriorityText(priority) {
        const priorities = {
            low: "নিম্ন",
            medium: "মাঝারি",
            high: "উচ্চ",
        };
        return priorities[priority] || "মাঝারি";
    }

    exportToPDF() {
        this.showNotification("📄 PDF তৈরি হচ্ছে...", "info");

        const now = new Date();
        const dateStr = now.toLocaleDateString("bn-BD", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const total = this.tasks.length;
        const completed = this.tasks.filter((t) => t.completed).length;
        const pending = total - completed;

        let content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ডেইলি টাস্ক ডকুমেন্ট</title>
                <style>
                    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                    .date { font-size: 14px; color: #666; }
                    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 25px; }
                    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                    .task { margin-bottom: 10px; padding: 8px; border-left: 3px solid #ccc; background: #fafafa; }
                    .task.completed { border-left-color: #28a745; background: #f0f8f0; }
                    .task.rejected { border-left-color: #dc3545; background: #f8d7da; }
                    .task-number { font-weight: bold; margin-right: 10px; }
                    .task-status { float: right; font-size: 12px; padding: 2px 8px; border-radius: 3px; background: #e9ecef; color: #6c757d; }
                    .task-status.completed { background: #28a745; color: white; }
                    .task-status.rejected { background: #dc3545; color: white; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">📄 ডেইলি টাস্ক ডকুমেন্ট</div>
                    <div class="date">📅 ${dateStr}</div>
                </div>

                <div class="summary">
                    <strong>📊 সারাংশ:</strong><br>
                    • মোট কাজ: ${total}<br>
                    • সম্পন্ন: ${completed}<br>
                    • বাকি: ${pending}
                </div>

                <div class="section-title">📋 কাজের তালিকা</div>
        `;

        if (this.tasks.length > 0) {
            this.tasks.forEach((task, index) => {
                const statusClass = task.completed
                    ? "completed"
                    : task.rejected
                      ? "rejected"
                      : "";
                const statusText = task.completed
                    ? "✅ সম্পন্ন"
                    : task.rejected
                      ? "❌ প্রত্যাখ্যান"
                      : "⏳ বাকি";

                content += `
                    <div class="task ${statusClass}">
                        <span class="task-number">${index + 1}.</span>
                        ${this.escapeHtml(task.text)}
                        <span class="task-status ${statusClass}">${statusText}</span>
                    </div>
                `;
            });
        } else {
            content += '<div class="task">📝 কোন কাজ যোগ করা হয়নি</div>';
        }

        content += `
                <div class="footer">
                    🕐 তৈরি করা হয়েছে: ${now.toLocaleString("bn-BD")}<br>
                    📄 ডকুমেন্ট আইডি: DOC-${now.getTime()}
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open("", "_blank");
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.print();

        this.showNotification("📄 PDF ডাউনলোড হয়েছে", "success");
    }

    exportToExcel() {
        this.showNotification("📊 Excel ফাইল তৈরি হচ্ছে...", "info");

        const now = new Date();
        const csvContent = this.generateCSV();

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `daily-tasks-${now.toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification("📊 Excel ডাউনলোড হয়েছে", "success");
    }

    generateCSV() {
        const headers = [
            "ক্রমিক নম্বর",
            "কাজের বিবরণ",
            "বিভাগ",
            "অগ্রাধিকার",
            "স্ট্যাটাস",
            "তৈরির সময়",
            "সম্পন্নের সময়",
        ];
        const rows = this.tasks.map((task, index) => [
            index + 1,
            `"${task.text.replace(/"/g, '""')}"`,
            this.getCategoryText(task.category || "general"),
            this.getPriorityText(task.priority || "medium"),
            task.completed
                ? "সম্পন্ন"
                : task.rejected
                  ? "প্রত্যাখ্যান"
                  : "বাকি",
            new Date(task.createdAt).toLocaleString("bn-BD"),
            task.completedAt
                ? new Date(task.completedAt).toLocaleString("bn-BD")
                : "N/A",
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.join(","))
            .join("\n");

        return "\uFEFF" + csvContent; // Add BOM for UTF-8
    }

    switchModalTab(tabName) {
        this.currentModalTab = tabName;

        // Update modal tab buttons
        document.querySelectorAll(".modal-tab-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.modalTab === tabName);
        });

        // Update modal tab content
        document.querySelectorAll(".modal-tab-pane").forEach((pane) => {
            pane.classList.remove("active");
        });
        document.getElementById(tabName + "Tab").classList.add("active");
    }

    openTaskModal(taskId) {
        this.selectedTaskId = taskId;
        const task = this.tasks.find((t) => t.id === taskId);
        if (!task) return;

        // Set task info
        document.getElementById("modalTaskTitle").textContent = "কাজের বিবরণ";
        document.getElementById("modalTaskText").textContent = task.text;
        document.getElementById("modalTaskTime").textContent =
            `তৈরি করা হয়েছে: ${this.formatTime(task.createdAt)}`;

        // Reset modal tabs
        this.switchModalTab("assign");

        // Clear form data
        document
            .querySelectorAll(
                ".assign-notes textarea, .complete-notes textarea, .reject-notes textarea",
            )
            .forEach((textarea) => {
                textarea.value = "";
            });
        document.querySelectorAll('input[type="radio"]').forEach((radio) => {
            radio.checked = false;
        });
        document
            .querySelectorAll('input[type="checkbox"]')
            .forEach((checkbox) => {
                checkbox.checked = false;
            });

        // Set default values
        document.querySelector(
            'input[name="priority"][value="medium"]',
        ).checked = true;
        document.querySelector(
            'input[name="rejectReason"][value="other"]',
        ).checked = true;

        // Show modal
        document.getElementById("taskModal").classList.add("show");
    }

    closeModal() {
        document.getElementById("taskModal").classList.remove("show");
        this.selectedTaskId = null;
    }

    openDocumentModal() {
        this.zoomLevel = 100;
        this.updateZoomDisplay();
        this.renderDocumentPreview();
        document.getElementById("documentModal").classList.add("show");
    }

    closeDocumentModal() {
        document.getElementById("documentModal").classList.remove("show");
    }

    assignTask() {
        if (!this.selectedTaskId) return;

        const priority =
            document.querySelector('input[name="priority"]:checked')?.value ||
            "medium";
        const notes = document.querySelector(".assign-notes textarea").value;

        const task = this.tasks.find((t) => t.id === this.selectedTaskId);
        if (task) {
            task.assigned = true;
            task.priority = priority;
            task.assignNotes = notes;
            task.assignedAt = new Date().toISOString();

            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateDocumentView();

            this.showNotification(
                `✅ কাজটি ${priority === "high" ? "উচ্চ" : priority === "low" ? "নিম্ন" : "মাঝারি"} অগ্রাধিকারে এসাইন করা হয়েছে`,
                "success",
            );
            this.closeModal();
        }
    }

    completeTask() {
        if (!this.selectedTaskId) return;

        const successfully = document.getElementById(
            "completedSuccessfully",
        ).checked;
        const onTime = document.getElementById("onTime").checked;
        const notes = document.querySelector(".complete-notes textarea").value;

        const task = this.tasks.find((t) => t.id === this.selectedTaskId);
        if (task) {
            task.completed = true;
            task.completedSuccessfully = successfully;
            task.completedOnTime = onTime;
            task.completeNotes = notes;
            task.completedAt = new Date().toISOString();

            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateDocumentView();

            this.showNotification("🎉 কাজটি সম্পন্ন হয়েছে!", "success");
            this.closeModal();
        }
    }

    rejectTask() {
        if (!this.selectedTaskId) return;

        const reason =
            document.querySelector('input[name="rejectReason"]:checked')
                ?.value || "other";
        const notes = document.querySelector(".reject-notes textarea").value;

        const task = this.tasks.find((t) => t.id === this.selectedTaskId);
        if (task) {
            task.rejected = true;
            task.rejectReason = reason;
            task.rejectNotes = notes;
            task.rejectedAt = new Date().toISOString();

            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateDocumentView();

            this.showNotification("❌ কাজটি প্রত্যাখ্যান করা হয়েছে", "info");
            this.closeModal();
        }
    }

    renderDocumentPreview() {
        const viewer = document.getElementById("pdfViewer");
        const now = new Date();
        const dateStr = now.toLocaleDateString("bn-BD", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const total = this.tasks.length;
        const completed = this.tasks.filter((t) => t.completed).length;
        const pending = total - completed;

        let content = `
            <div class="pdf-document">
                <div class="doc-header">
                    <div class="doc-title">📄 ডেইলি টাস্ক ডকুমেন্ট</div>
                    <div class="doc-date">📅 ${dateStr}</div>
                </div>

                <div class="doc-summary">
                    <strong>📊 সারাংশ:</strong><br>
                    • মোট কাজ: ${total}<br>
                    • সম্পন্ন: ${completed}<br>
                    • বাকি: ${pending}
                </div>

                <div class="doc-section">
                    <div class="doc-section-title">📋 কাজের তালিকা</div>
        `;

        if (this.tasks.length > 0) {
            this.tasks.forEach((task, index) => {
                const statusClass = task.completed
                    ? "completed"
                    : task.rejected
                      ? "rejected"
                      : "assigned";
                const statusText = task.completed
                    ? "✅ সম্পন্ন"
                    : task.rejected
                      ? "❌ প্রত্যাখ্যান"
                      : "⏳ বাকি";

                content += `
                    <div class="doc-task ${statusClass}">
                        <span class="doc-task-number">${index + 1}.</span>
                        ${this.escapeHtml(task.text)}
                        <span class="doc-task-status ${statusClass}">${statusText}</span>
                    </div>
                `;
            });
        } else {
            content += '<div class="doc-task">📝 কোন কাজ যোগ করা হয়নি</div>';
        }

        content += `
                </div>

                <div class="doc-footer">
                    🕐 তৈরি করা হয়েছে: ${now.toLocaleString("bn-BD")}<br>
                    📄 ডকুমেন্ট আইডি: DOC-${now.getTime()}
                </div>
            </div>
        `;

        viewer.innerHTML = content;
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel + 10, 200);
        this.applyZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel - 10, 50);
        this.applyZoom();
    }

    resetZoom() {
        this.zoomLevel = 100;
        this.applyZoom();
    }

    applyZoom() {
        const viewer = document.getElementById("pdfViewer");
        viewer.style.transform = `scale(${this.zoomLevel / 100})`;
        this.updateZoomDisplay();
    }

    updateZoomDisplay() {
        document.querySelector(".zoom-level").textContent =
            `${this.zoomLevel}%`;
    }

    printDocument() {
        const printContent = document.getElementById("pdfViewer").innerHTML;
        const printWindow = window.open("", "_blank");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ডেইলি টাস্ক ডকুমেন্ট</title>
                <style>
                    body { font-family: 'Times New Roman', serif; line-height: 1.6; }
                    .doc-title { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
                    .doc-date { font-size: 14px; color: #666; text-align: center; margin-bottom: 30px; }
                    .doc-summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 25px; border-left: 4px solid #667eea; }
                    .doc-section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                    .doc-task { margin-bottom: 10px; padding: 8px; border-left: 3px solid #ccc; background: #fafafa; }
                    .doc-task.completed { border-left-color: #28a745; background: #f0f8f0; }
                    .doc-task.assigned { border-left-color: #6c757d; background: #f8f9fa; }
                    .doc-task-number { font-weight: bold; margin-right: 10px; }
                    .doc-task-status { float: right; font-size: 12px; padding: 2px 8px; border-radius: 3px; background: #e9ecef; color: #6c757d; }
                    .doc-task-status.completed { background: #28a745; color: white; }
                    .doc-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();

        this.showNotification("🖨️ ডকুমেন্ট প্রিন্ট হচ্ছে", "info");
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll(".tab-content").forEach((content) => {
            content.classList.remove("active");
        });
        document.getElementById(tabName + "View").classList.add("active");

        // Update document view when switching to document tab
        if (tabName === "document") {
            this.updateDocumentView();
        }
    }

    showNotification(message, type = "info") {
        const notification = document.getElementById("notification");
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove("show");
        }, 3000);
    }

    updateDate() {
        const now = new Date();
        const options = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        };
        const dateStr = now.toLocaleDateString("bn-BD", options);
        document.getElementById("currentDate").textContent = dateStr;
        document.getElementById("docDate").textContent = dateStr;
    }

    loadTasks() {
        // Load tasks for current user
        const userTasksKey = `dailyTasks_${this.currentUser.userId}`;
        const stored = localStorage.getItem(userTasksKey);
        if (stored) {
            this.tasks = JSON.parse(stored);
        } else {
            this.tasks = [];
        }
    }

    saveTasks() {
        // Save tasks for current user
        const userTasksKey = `dailyTasks_${this.currentUser.userId}`;
        localStorage.setItem(userTasksKey, JSON.stringify(this.tasks));
    }

    addTask() {
        const input = document.getElementById("taskInput");
        const categorySelect = document.getElementById("categorySelect");
        const prioritySelect = document.getElementById("prioritySelect");
        const taskText = input.value.trim();

        if (taskText === "") {
            this.showNotification("দয়া করে একটি কাজ লিখুন!", "error");
            return;
        }

        const task = {
            id: Date.now(),
            text: taskText,
            category: categorySelect.value,
            priority: prioritySelect.value,
            completed: false,
            assigned: false,
            rejected: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            assignedAt: null,
            rejectedAt: null,
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateDocumentView();

        this.showNotification("✅ কাজটি যোগ করা হয়েছে", "success");

        input.value = "";
        input.focus();
    }

    toggleTask(id) {
        const task = this.tasks.find((t) => t.id === id);
        if (task) {
            const wasCompleted = task.completed;
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateDocumentView();

            if (task.completed) {
                this.showNotification("🎉 কাজটি সম্পন্ন হয়েছে!", "success");
            }
        }
    }

    deleteTask(id) {
        const taskIndex = this.tasks.findIndex((t) => t.id === id);
        if (taskIndex !== -1) {
            const taskText = this.tasks[taskIndex].text;
            this.tasks.splice(taskIndex, 1);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateDocumentView();

            this.showNotification("🗑️ কাজটি মুছে ফেলা হয়েছে", "info");
        }
    }

    clearCompleted() {
        const completedCount = this.tasks.filter((t) => t.completed).length;
        if (completedCount === 0) {
            this.showNotification("সম্পন্ন করা কাজ নেই!", "error");
            return;
        }

        if (
            confirm(`আপনি কি ${completedCount} টি সম্পন্ন কাজ মুছে ফেলতে চান?`)
        ) {
            this.tasks = this.tasks.filter((t) => !t.completed);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateDocumentView();

            this.showNotification(
                `✅ ${completedCount} টি সম্পন্ন কাজ মুছে ফেলা হয়েছে`,
                "success",
            );
        }
    }

    clearAll() {
        if (this.tasks.length === 0) {
            this.showNotification("কোন কাজ নেই!", "error");
            return;
        }

        if (confirm(`আপনি কি সব ${this.tasks.length} টি কাজ মুছে ফেলতে চান?`)) {
            this.tasks = [];
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateDocumentView();

            this.showNotification("🔄 সব কাজ মুছে ফেলা হয়েছে", "info");
        }
    }

    updateDocumentView() {
        const container = document.getElementById("documentTasks");
        const total = this.tasks.length;
        const completed = this.tasks.filter((t) => t.completed).length;
        const pending = total - completed;

        // Update summary
        document.getElementById("docTotal").textContent = total;
        document.getElementById("docCompleted").textContent = completed;
        document.getElementById("docPending").textContent = pending;

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📝 কোন কাজ যোগ করা হয়নি</h3>
                    <p>নিচে নতুন কাজ যোগ করে শুরু করুন</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.tasks
            .map(
                (task) => `
            <div class="document-task-item ${task.completed ? "completed" : task.rejected ? "rejected" : "assigned"}">
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <span class="task-status">
                    ${task.completed ? "✅ সম্পন্ন" : task.rejected ? "❌ প্রত্যাখ্যান" : "⏳ বাকি"}
                </span>
            </div>
        `,
            )
            .join("");
    }

    downloadDocument() {
        const now = new Date();
        const dateStr = now.toLocaleDateString("bn-BD", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const total = this.tasks.length;
        const completed = this.tasks.filter((t) => t.completed).length;
        const pending = total - completed;

        let content = `📄 ডেইলি টাস্ক ডকুমেন্ট\n`;
        content += `📅 ${dateStr}\n`;
        content += `${"=".repeat(50)}\n\n`;

        content += `📊 সারাংশ:\n`;
        content += `• মোট কাজ: ${total}\n`;
        content += `• সম্পন্ন: ${completed}\n`;
        content += `• বাকি: ${pending}\n\n`;

        if (this.tasks.length > 0) {
            content += `📋 কাজের তালিকা:\n`;
            content += `${"-".repeat(50)}\n`;

            this.tasks.forEach((task, index) => {
                const status = task.completed
                    ? "✅ সম্পন্ন"
                    : task.rejected
                      ? "❌ প্রত্যাখ্যান"
                      : "⏳ বাকি";
                content += `${index + 1}. ${task.text} - ${status}\n`;
            });
        } else {
            content += `📝 কোন কাজ যোগ করা হয়নি\n`;
        }

        content += `\n${"=".repeat(50)}\n`;
        content += `🕐 তৈরি করা হয়েছে: ${now.toLocaleString("bn-BD")}\n`;

        // Create and download file
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `daily-tasks-${now.toISOString().split("T")[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification("📥 ডকুমেন্ট ডাউনলোড হয়েছে", "success");
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "এইমাত্র";
        if (diffMins < 60) return `${diffMins} মিনিট আগে`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} দিন আগে`;
    }

    renderTasks() {
        this.renderFilteredTasks(this.getFilteredTasks());
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter((t) => t.completed).length;
        const pending = total - completed;
        const urgent = this.tasks.filter(
            (t) => t.priority === "high" && !t.completed && !t.rejected,
        ).length;

        document.getElementById("totalTasks").textContent = total;
        document.getElementById("completedTasks").textContent = completed;
        document.getElementById("pendingTasks").textContent = pending;
        document.getElementById("urgentTasks").textContent = urgent;

        // Update progress bar
        const progressBar = document.getElementById("progressBar");
        const progressText = document.getElementById("progressText");
        const percentage =
            total > 0 ? Math.round((completed / total) * 100) : 0;

        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

const app = new TodoApp();
