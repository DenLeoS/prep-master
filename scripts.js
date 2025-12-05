document.addEventListener('DOMContentLoaded', () => {
    let allQuestions = [];
    let currentTopic = 'all';
    let currentSort = 'priority';
    let currentDifficulty = 'all';
    let currentStatus = 'all';
    let currentView = 'cards';
    let userTags = JSON.parse(localStorage.getItem('prepmaster_tags') || '{}');
    let currentQuestionsList = []; // For modal navigation
    let currentQuestionIndex = 0;

    // DOM Elements
    const topicCardsView = document.getElementById('topicCardsView');
    const questionsGrid = document.getElementById('questionsGrid');
    const topicGroupsContainer = document.getElementById('topicGroups');
    const searchInput = document.getElementById('searchInput');
    const sidebarSearchInput = document.getElementById('sidebarSearchInput');
    const sortSelect = document.getElementById('sortSelect');
    const totalCount = document.getElementById('totalCount');
    const highPriorityCount = document.getElementById('highPriorityCount');
    const allTopicsCount = document.getElementById('allTopicsCount');
    const topicTitle = document.getElementById('currentTopicTitle');
    const topicSubtitle = document.getElementById('currentTopicSubtitle');
    const topicList = document.getElementById('topicList');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const statusFilter = document.getElementById('statusFilter');
    const viewFilter = document.getElementById('viewFilter');

    // Topic Groups Configuration
    const TOPIC_GROUPS = {
        'Java & OOP': ['Java', 'Java - OOPS', 'Java - Collections', 'Java - Strings', 'Java - Exceptions'],
        'Selenium': ['Selenium', 'Selenium - XPath', 'Selenium - Waits', 'Selenium - Exceptions', 'Selenium - Actions', 'Selenium - JavaScript', 'Advanced Selenium'],
        'Frameworks': ['Framework', 'Framework - POM', 'Framework - OOPS', 'TestNG', 'Cucumber', 'BDD'],
        'API & Database': ['API Testing', 'API Testing Advanced', 'REST API', 'SQL', 'JDBC', 'Apache POI'],
        'DevOps & Tools': ['Git', 'Maven', 'Jenkins', 'Docker', 'Parallel', 'Allure Reports'],
        'Soft Skills': ['Interview', 'Agile', 'Advanced Concepts', 'Accessibility Testing', 'Performance Testing']
    };

    // Fetch Data
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            allQuestions = data;
            init();
        })
        .catch(err => {
            console.error('Fetch error:', err);
            topicCardsView.innerHTML = '<p class="no-results">Error loading questions.</p>';
        });

    function init() {
        updateStats();
        updateProgress();
        populateSidebar();
        renderTopicCards();
        setupEventListeners();
        setupMobileNav();
        setupGlobalSearch();
        setupProgressDashboard();
    }

    function updateStats() {
        totalCount.textContent = allQuestions.length;
        const highPriority = allQuestions.filter(q => q.priority >= 4).length;
        highPriorityCount.textContent = highPriority;
        allTopicsCount.textContent = allQuestions.length;
    }

    function updateProgress() {
        const completed = Object.values(userTags).filter(t => t.done).length;
        const revise = Object.values(userTags).filter(t => t.revise).length;
        const starred = Object.values(userTags).filter(t => t.starred).length;
        const total = allQuestions.length;

        document.getElementById('completedCount').textContent = completed;
        document.getElementById('reviseCount').textContent = revise;
        document.getElementById('starredCount').textContent = starred;

        const percentage = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
        document.getElementById('progressBar').style.width = percentage + '%';
        document.getElementById('progressText').textContent = `${completed} of ${total} (${percentage}%)`;
    }

    function populateSidebar() {
        // Create collapsible topic groups
        Object.entries(TOPIC_GROUPS).forEach(([groupName, topics]) => {
            const group = document.createElement('div');
            group.className = 'topic-group';

            const header = document.createElement('div');
            header.className = 'topic-group-header';
            header.innerHTML = `<span>${groupName}</span><i class="fa-solid fa-chevron-down"></i>`;

            const items = document.createElement('ul');
            items.className = 'topic-group-items nav-links';

            topics.forEach(topic => {
                const count = allQuestions.filter(q => q.topic === topic).length;
                if (count > 0) {
                    const li = document.createElement('li');
                    li.dataset.topic = topic;
                    li.innerHTML = `${topic} <span class="topic-count">${count}</span>`;
                    li.addEventListener('click', () => selectTopic(topic));
                    items.appendChild(li);
                }
            });

            if (items.children.length > 0) {
                header.addEventListener('click', () => {
                    group.classList.toggle('open');
                });
                group.appendChild(header);
                group.appendChild(items);
                topicGroupsContainer.appendChild(group);
            }
        });

        // Handle uncategorized topics
        const categorizedTopics = Object.values(TOPIC_GROUPS).flat();
        const uncategorized = [...new Set(allQuestions.map(q => q.topic))]
            .filter(t => !categorizedTopics.includes(t));

        if (uncategorized.length > 0) {
            const group = document.createElement('div');
            group.className = 'topic-group';

            const header = document.createElement('div');
            header.className = 'topic-group-header';
            header.innerHTML = `<span>Other Topics</span><i class="fa-solid fa-chevron-down"></i>`;

            const items = document.createElement('ul');
            items.className = 'topic-group-items nav-links';

            uncategorized.forEach(topic => {
                const count = allQuestions.filter(q => q.topic === topic).length;
                const li = document.createElement('li');
                li.dataset.topic = topic;
                li.innerHTML = `${topic} <span class="topic-count">${count}</span>`;
                li.addEventListener('click', () => selectTopic(topic));
                items.appendChild(li);
            });

            header.addEventListener('click', () => group.classList.toggle('open'));
            group.appendChild(header);
            group.appendChild(items);
            topicGroupsContainer.appendChild(group);
        }

        // All Topics click
        document.querySelector('[data-topic="all"]').addEventListener('click', () => {
            currentTopic = 'all';
            topicTitle.textContent = 'All Topics';
            topicSubtitle.textContent = 'Browse by topic or search for specific questions';
            updateActiveState();
            if (currentView === 'cards') {
                renderTopicCards();
            } else {
                renderQuestionsList();
            }
        });
    }

    function selectTopic(topic) {
        currentTopic = topic;
        topicTitle.textContent = topic;
        topicSubtitle.textContent = `${allQuestions.filter(q => q.topic === topic).length} questions`;
        updateActiveState();

        // Switch to list view when topic is selected
        currentView = 'list';
        updateViewButtons();
        topicCardsView.style.display = 'none';
        questionsGrid.style.display = 'flex';
        renderQuestionsList();

        // Close sidebar on mobile
        closeSidebar();
    }

    function updateActiveState() {
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        const activeEl = document.querySelector(`[data-topic="${currentTopic}"]`);
        if (activeEl) activeEl.classList.add('active');
    }

    function renderTopicCards() {
        topicCardsView.innerHTML = '';
        topicCardsView.style.display = 'grid';
        questionsGrid.style.display = 'none';

        const topics = [...new Set(allQuestions.map(q => q.topic))].sort();

        topics.forEach(topic => {
            const questions = allQuestions.filter(q => q.topic === topic);
            const basicCount = questions.filter(q => q.difficulty === 'Basic').length;
            const intermediateCount = questions.filter(q => q.difficulty === 'Intermediate').length;
            const advancedCount = questions.filter(q => q.difficulty === 'Advanced').length;
            const highPriorityCount = questions.filter(q => q.priority >= 4).length;
            const avgPriority = (questions.reduce((a, b) => a + b.priority, 0) / questions.length).toFixed(1);

            const card = document.createElement('div');
            card.className = 'topic-card';
            card.innerHTML = `
                <div class="topic-card-header">
                    <div class="topic-card-title">
                        <i class="fa-solid fa-folder-open"></i>
                        ${topic}
                    </div>
                    <span class="topic-card-count">${questions.length}</span>
                </div>
                <div class="topic-card-stats">
                    <span class="stat-badge basic">Basic: ${basicCount}</span>
                    <span class="stat-badge intermediate">Med: ${intermediateCount}</span>
                    <span class="stat-badge advanced">Adv: ${advancedCount}</span>
                </div>
                <div class="topic-card-priority">
                    🔥 ${highPriorityCount} high priority questions
                </div>
                <div class="topic-card-actions">
                    <button class="topic-card-btn primary" data-topic="${topic}" data-view="priority">
                        🔥 High Priority
                    </button>
                    <button class="topic-card-btn secondary" data-topic="${topic}" data-view="all">
                        View All →
                    </button>
                </div>
            `;

            // Event listeners for buttons
            card.querySelector('.topic-card-btn.primary').addEventListener('click', (e) => {
                e.stopPropagation();
                currentTopic = topic;
                currentSort = 'priority';
                sortSelect.value = 'priority';
                selectTopic(topic);
            });

            card.querySelector('.topic-card-btn.secondary').addEventListener('click', (e) => {
                e.stopPropagation();
                selectTopic(topic);
            });

            card.addEventListener('click', () => selectTopic(topic));

            topicCardsView.appendChild(card);
        });
    }

    function renderQuestionsList() {
        questionsGrid.innerHTML = '';

        let filtered = allQuestions;

        // Filter by topic
        if (currentTopic !== 'all') {
            filtered = filtered.filter(q => q.topic === currentTopic);
        }

        // Filter by search
        const query = (searchInput.value || sidebarSearchInput?.value || '').toLowerCase();
        if (query) {
            filtered = filtered.filter(q =>
                q.question.toLowerCase().includes(query) ||
                q.answer.toLowerCase().includes(query) ||
                q.topic.toLowerCase().includes(query)
            );
        }

        // Filter by difficulty
        if (currentDifficulty !== 'all') {
            filtered = filtered.filter(q => q.difficulty === currentDifficulty);
        }

        // Filter by status
        if (currentStatus !== 'all') {
            filtered = filtered.filter(q => {
                const tags = userTags[q.id] || {};
                if (currentStatus === 'done') return tags.done;
                if (currentStatus === 'revise') return tags.revise;
                if (currentStatus === 'starred') return tags.starred;
                if (currentStatus === 'pending') return !tags.done;
                return true;
            });
        }

        if (filtered.length === 0) {
            questionsGrid.innerHTML = '<div class="no-results">No questions found matching your criteria.</div>';
            return;
        }

        // Store for modal navigation
        currentQuestionsList = filtered;

        // Group by topic
        const grouped = {};
        filtered.forEach(q => {
            if (!grouped[q.topic]) grouped[q.topic] = [];
            grouped[q.topic].push(q);
        });

        // Sort each group
        Object.keys(grouped).forEach(topic => {
            grouped[topic].sort((a, b) => {
                if (currentSort === 'priority') return b.priority - a.priority;
                if (currentSort === 'difficulty') {
                    const map = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3 };
                    return (map[b.difficulty] || 0) - (map[a.difficulty] || 0);
                }
                if (currentSort === 'alphabetical') {
                    return a.question.localeCompare(b.question);
                }
                if (currentSort === 'completed') {
                    const aCompleted = userTags[a.id]?.done ? 1 : 0;
                    const bCompleted = userTags[b.id]?.done ? 1 : 0;
                    return bCompleted - aCompleted;
                }
                return b.id - a.id;
            });
        });

        // Render
        const topics = currentTopic === 'all' ? Object.keys(grouped).sort() : [currentTopic];

        topics.forEach(topic => {
            if (!grouped[topic]) return;

            const section = document.createElement('div');
            section.className = 'topic-section';
            section.id = 'topic-' + topic.replace(/[^a-zA-Z0-9]/g, '-');

            section.innerHTML = `
                <div class="topic-heading">
                    <h2><i class="fa-solid fa-bookmark"></i> ${topic}</h2>
                    <span class="question-count">${grouped[topic].length} questions</span>
                </div>
                <div class="topic-questions"></div>
            `;

            const container = section.querySelector('.topic-questions');

            grouped[topic].forEach((q, idx) => {
                const card = document.createElement('div');
                card.className = 'question-card';
                card.dataset.index = idx;

                const tags = userTags[q.id] || {};
                if (tags.done) card.classList.add('is-done');
                if (tags.revise) card.classList.add('is-revise');
                if (tags.starred) card.classList.add('is-starred');

                const stars = '★'.repeat(Math.min(q.priority, 5));
                const diffClass = q.difficulty?.toLowerCase() || '';

                card.innerHTML = `
                    <div class="card-header">
                        <div class="badges">
                            <span class="badge priority">${stars}</span>
                            <span class="badge difficulty ${diffClass}">${q.difficulty}</span>
                            ${tags.done ? '<span class="badge" style="background:var(--diff-basic);color:white"><i class="fa-solid fa-check"></i></span>' : ''}
                            ${tags.revise ? '<span class="badge" style="background:var(--diff-intermediate);color:white"><i class="fa-solid fa-rotate"></i></span>' : ''}
                            ${tags.starred ? '<span class="badge" style="background:var(--accent);color:white"><i class="fa-solid fa-star"></i></span>' : ''}
                        </div>
                    </div>
                    <div class="question-text">${q.question}</div>
                    <div class="card-expand-hint"><i class="fa-solid fa-eye"></i> View Answer</div>
                `;

                card.addEventListener('click', () => {
                    currentQuestionIndex = currentQuestionsList.findIndex(item => item.id === q.id);
                    openModal(q);
                });
                container.appendChild(card);
            });

            questionsGrid.appendChild(section);
        });
    }

    // Modal
    const modal = document.getElementById('answerModal');
    const modalBadges = document.getElementById('modalBadges');
    const modalQuestion = document.getElementById('modalQuestion');
    const modalAnswer = document.getElementById('modalAnswer');
    const modalLink = document.getElementById('modalLink');
    let currentModalQuestion = null;

    function openModal(q) {
        currentModalQuestion = q;
        const stars = '★'.repeat(Math.min(q.priority, 5));
        const tags = userTags[q.id] || {};
        const diffClass = q.difficulty?.toLowerCase() || '';

        modalBadges.innerHTML = `
            <span class="badge priority">${stars} Priority</span>
            <span class="badge difficulty ${diffClass}">${q.difficulty}</span>
            <span class="badge" style="background:var(--primary);color:white">${q.topic}</span>
        `;
        modalQuestion.textContent = q.question;
        modalAnswer.innerHTML = formatAnswer(q.answer);

        // Update link
        const modalLinkText = document.getElementById('modalLinkText');
        if (q.link && q.link !== '#') {
            modalLink.href = q.link;
            modalLink.style.display = 'inline-flex';
            // Try to make link text contextual
            if (q.link.includes('selenium')) modalLinkText.textContent = 'Selenium Docs';
            else if (q.link.includes('java')) modalLinkText.textContent = 'Java Docs';
            else if (q.link.includes('testng')) modalLinkText.textContent = 'TestNG Docs';
            else modalLinkText.textContent = 'Learn More';
        } else {
            modalLink.style.display = 'none';
        }

        // Update action buttons
        updateActionButtons(tags);

        // Update navigation
        updateModalNavigation();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateActionButtons(tags) {
        document.getElementById('markDone').classList.toggle('active', tags.done);
        document.getElementById('markRevise').classList.toggle('active', tags.revise);
        document.getElementById('markStar').classList.toggle('active', tags.starred);

        const starBtn = document.getElementById('markStar');
        starBtn.innerHTML = tags.starred ? '<i class="fa-solid fa-star"></i> Starred' : '<i class="fa-regular fa-star"></i> Star';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        currentModalQuestion = null;
    }

    document.getElementById('closeModal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Personalization
    document.getElementById('markDone').addEventListener('click', () => toggleTag('done'));
    document.getElementById('markRevise').addEventListener('click', () => toggleTag('revise'));
    document.getElementById('markStar').addEventListener('click', () => toggleTag('starred'));

    function toggleTag(tag) {
        if (!currentModalQuestion) return;
        const id = currentModalQuestion.id;
        if (!userTags[id]) userTags[id] = {};
        userTags[id][tag] = !userTags[id][tag];
        localStorage.setItem('prepmaster_tags', JSON.stringify(userTags));
        updateActionButtons(userTags[id]);
        updateProgress(); // Update progress dashboard
    }

    function formatAnswer(text) {
        if (!text) return 'No answer available.';
        let formatted = text.replace(/\n/g, '<br>');
        formatted = formatted.replace(/<code>/g, '<pre class="code-block"><code>');
        formatted = formatted.replace(/<\/code>/g, '</code></pre>');
        return formatted;
    }

    function setupEventListeners() {
        // Search
        searchInput?.addEventListener('input', debounce(() => {
            if (currentView === 'list') renderQuestionsList();
        }, 300));

        sidebarSearchInput?.addEventListener('input', debounce(() => {
            if (currentView === 'list') renderQuestionsList();
        }, 300));

        // Sort
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            if (currentView === 'list') renderQuestionsList();
        });

        // Difficulty filter
        difficultyFilter.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                difficultyFilter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentDifficulty = btn.dataset.value;
                if (currentView === 'list') renderQuestionsList();
            });
        });

        // View filter
        viewFilter.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                viewFilter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.value;

                if (currentView === 'cards') {
                    currentTopic = 'all';
                    topicTitle.textContent = 'All Topics';
                    topicSubtitle.textContent = 'Browse by topic or search for specific questions';
                    updateActiveState();
                    renderTopicCards();
                } else {
                    renderQuestionsList();
                    topicCardsView.style.display = 'none';
                    questionsGrid.style.display = 'flex';
                }
            });
        });
    }

    function updateViewButtons() {
        viewFilter.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === currentView);
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Mobile Navigation
    function setupMobileNav() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const menuBtn = document.getElementById('menuBtn');
        const menuToggle = document.getElementById('menuToggle');
        const homeBtn = document.getElementById('homeBtn');
        const filterBtn = document.getElementById('filterBtn');
        const closeSidebarBtn = document.getElementById('closeSidebar');

        function openSidebar() {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        }

        window.closeSidebar = function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        menuBtn?.addEventListener('click', openSidebar);
        menuToggle?.addEventListener('click', openSidebar);
        closeSidebarBtn?.addEventListener('click', closeSidebar);
        overlay?.addEventListener('click', closeSidebar);

        homeBtn?.addEventListener('click', () => {
            currentTopic = 'all';
            currentView = 'cards';
            topicTitle.textContent = 'All Topics';
            topicSubtitle.textContent = 'Browse by topic or search for specific questions';
            updateActiveState();
            updateViewButtons();
            renderTopicCards();
        });

        filterBtn?.addEventListener('click', () => {
            document.querySelector('.filter-bar').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Global Search with Dropdown
    function setupGlobalSearch() {
        const searchDropdown = document.getElementById('searchDropdown');
        const searchResultsPreview = document.getElementById('searchResultsPreview');
        const searchClear = document.getElementById('searchClear');
        const suggestionChips = document.querySelectorAll('.suggestion-chip');

        // Show dropdown on focus
        searchInput?.addEventListener('focus', () => {
            searchDropdown?.classList.add('active');
            if (searchInput.value.length >= 2) {
                performSearch(searchInput.value);
            }
        });

        // Hide dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                searchDropdown?.classList.remove('active');
            }
        });

        // Search as you type
        searchInput?.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                performSearch(query);
            } else {
                searchResultsPreview.innerHTML = '';
            }
        }, 200));

        // Clear button
        searchClear?.addEventListener('click', () => {
            searchInput.value = '';
            searchResultsPreview.innerHTML = '';
            searchInput.focus();
        });

        // Suggestion chips
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const query = chip.dataset.query;
                searchInput.value = query;
                performSearch(query);
            });
        });

        // Enter to search all
        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    executeFullSearch(query);
                    searchDropdown?.classList.remove('active');
                }
            }
        });

        function performSearch(query) {
            const lowerQuery = query.toLowerCase();

            // Search across ALL questions (global search)
            const results = allQuestions.filter(q =>
                q.question.toLowerCase().includes(lowerQuery) ||
                q.answer.toLowerCase().includes(lowerQuery) ||
                q.topic.toLowerCase().includes(lowerQuery)
            );

            // Group results by topic
            const groupedResults = {};
            results.forEach(q => {
                if (!groupedResults[q.topic]) groupedResults[q.topic] = [];
                groupedResults[q.topic].push(q);
            });

            // Build preview HTML
            let html = '';

            // Summary
            const topicCount = Object.keys(groupedResults).length;
            html += `<div class="search-results-summary">
                Found <strong>${results.length}</strong> results across <strong>${topicCount}</strong> topics
            </div>`;

            // Show top 5 results
            const topResults = results.slice(0, 5);
            topResults.forEach(q => {
                const diffClass = q.difficulty?.toLowerCase() || '';
                html += `
                    <div class="search-result-item" data-id="${q.id}">
                        <div class="search-result-content">
                            <div class="search-result-question">${highlightText(q.question, query)}</div>
                            <div class="search-result-meta">
                                <span class="search-result-badge topic">${q.topic}</span>
                                <span class="search-result-badge difficulty ${diffClass}">${q.difficulty}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            if (results.length > 5) {
                html += `<div class="search-view-all" id="viewAllResults">View all ${results.length} results →</div>`;
            }

            searchResultsPreview.innerHTML = html;

            // Add click handlers
            searchResultsPreview.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = parseInt(item.dataset.id);
                    const q = allQuestions.find(q => q.id === id);
                    if (q) {
                        openModal(q);
                        searchDropdown?.classList.remove('active');
                    }
                });
            });

            document.getElementById('viewAllResults')?.addEventListener('click', () => {
                executeFullSearch(query);
                searchDropdown?.classList.remove('active');
            });
        }

        function executeFullSearch(query) {
            currentTopic = 'all';
            currentView = 'list';
            topicTitle.textContent = `Search: "${query}"`;

            const lowerQuery = query.toLowerCase();
            const results = allQuestions.filter(q =>
                q.question.toLowerCase().includes(lowerQuery) ||
                q.answer.toLowerCase().includes(lowerQuery) ||
                q.topic.toLowerCase().includes(lowerQuery)
            );

            topicSubtitle.textContent = `${results.length} results found`;
            updateActiveState();
            updateViewButtons();

            // Render search results
            topicCardsView.style.display = 'none';
            questionsGrid.style.display = 'flex';
            renderSearchResults(results, query);
        }

        function renderSearchResults(results, query) {
            questionsGrid.innerHTML = '';

            if (results.length === 0) {
                questionsGrid.innerHTML = `<div class="no-results">No questions found for "${query}"</div>`;
                return;
            }

            // Group by topic
            const grouped = {};
            results.forEach(q => {
                if (!grouped[q.topic]) grouped[q.topic] = [];
                grouped[q.topic].push(q);
            });

            Object.keys(grouped).sort().forEach(topic => {
                const section = document.createElement('div');
                section.className = 'topic-section';

                section.innerHTML = `
                    <div class="topic-heading">
                        <h2><i class="fa-solid fa-bookmark"></i> ${topic}</h2>
                        <span class="question-count">${grouped[topic].length} matches</span>
                    </div>
                    <div class="topic-questions"></div>
                `;

                const container = section.querySelector('.topic-questions');

                grouped[topic].forEach(q => {
                    const card = document.createElement('div');
                    card.className = 'question-card';

                    const stars = '★'.repeat(Math.min(q.priority, 5));
                    const diffClass = q.difficulty?.toLowerCase() || '';

                    card.innerHTML = `
                        <div class="card-header">
                            <div class="badges">
                                <span class="badge priority">${stars}</span>
                                <span class="badge difficulty ${diffClass}">${q.difficulty}</span>
                            </div>
                        </div>
                        <div class="question-text">${highlightText(q.question, query)}</div>
                        <div class="card-expand-hint">Tap to view answer</div>
                    `;

                    card.addEventListener('click', () => openModal(q));
                    container.appendChild(card);
                });

                questionsGrid.appendChild(section);
            });
        }

        function highlightText(text, query) {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark style="background:var(--primary-glow);color:var(--primary);padding:0 2px;border-radius:2px;">$1</mark>');
        }
    }

    // Progress Dashboard & Quick Links
    function setupProgressDashboard() {
        const showRevision = document.getElementById('showRevision');
        const showStarred = document.getElementById('showStarred');
        const resetFilters = document.getElementById('resetFilters');
        const progressBtn = document.getElementById('progressBtn');

        showRevision?.addEventListener('click', () => {
            currentStatus = 'revise';
            currentView = 'list';
            topicTitle.textContent = 'Revision Queue';
            topicSubtitle.textContent = 'Questions marked for revision';
            updateFiltersUI();
            renderQuestionsList();
            closeSidebar();
        });

        showStarred?.addEventListener('click', () => {
            currentStatus = 'starred';
            currentView = 'list';
            topicTitle.textContent = 'Starred Questions';
            topicSubtitle.textContent = 'Your bookmarked questions';
            updateFiltersUI();
            renderQuestionsList();
            closeSidebar();
        });

        resetFilters?.addEventListener('click', () => {
            currentDifficulty = 'all';
            currentStatus = 'all';
            currentSort = 'priority';
            sortSelect.value = 'priority';
            updateFiltersUI();
            updateActiveFiltersIndicator();
            if (currentView === 'list') renderQuestionsList();
        });

        progressBtn?.addEventListener('click', () => {
            openProgressModal();
        });

        // Status filter buttons
        statusFilter?.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                statusFilter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatus = btn.dataset.value;
                updateActiveFiltersIndicator();
                if (currentView === 'list') renderQuestionsList();
            });
        });
    }

    function updateFiltersUI() {
        difficultyFilter?.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === currentDifficulty);
        });
        statusFilter?.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === currentStatus);
        });
        viewFilter?.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === currentView);
        });
        topicCardsView.style.display = currentView === 'cards' ? 'grid' : 'none';
        questionsGrid.style.display = currentView === 'list' ? 'flex' : 'none';
    }

    function updateActiveFiltersIndicator() {
        const activeFilters = document.getElementById('activeFilters');
        const activeFilterTags = document.getElementById('activeFilterTags');
        const filterWarning = document.getElementById('filterWarning');

        const hasFilters = currentDifficulty !== 'all' || currentStatus !== 'all';
        activeFilters.style.display = hasFilters ? 'flex' : 'none';

        if (hasFilters) {
            let tags = '';
            if (currentDifficulty !== 'all') {
                tags += `<span class="filter-tag">${currentDifficulty}</span>`;
            }
            if (currentStatus !== 'all') {
                tags += `<span class="filter-tag">${currentStatus}</span>`;
            }
            activeFilterTags.innerHTML = tags;

            // Check for no results warning
            const filtered = getFilteredQuestions();
            if (filtered.length === 0) {
                filterWarning.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> No questions match these filters';
            } else {
                filterWarning.innerHTML = '';
            }
        }
    }

    function getFilteredQuestions() {
        let filtered = allQuestions;

        if (currentTopic !== 'all') {
            filtered = filtered.filter(q => q.topic === currentTopic);
        }
        if (currentDifficulty !== 'all') {
            filtered = filtered.filter(q => q.difficulty === currentDifficulty);
        }
        if (currentStatus !== 'all') {
            filtered = filtered.filter(q => {
                const tags = userTags[q.id] || {};
                if (currentStatus === 'done') return tags.done;
                if (currentStatus === 'revise') return tags.revise;
                if (currentStatus === 'starred') return tags.starred;
                if (currentStatus === 'pending') return !tags.done;
                return true;
            });
        }
        return filtered;
    }

    function openProgressModal() {
        // Show progress summary as alert for now
        const completed = Object.values(userTags).filter(t => t.done).length;
        const revise = Object.values(userTags).filter(t => t.revise).length;
        const starred = Object.values(userTags).filter(t => t.starred).length;
        const percentage = Math.round((completed / allQuestions.length) * 100) || 0;

        alert(`📊 Your Progress\n\n✅ Completed: ${completed}\n🔄 To Revise: ${revise}\n⭐ Starred: ${starred}\n\n${percentage}% Complete`);
    }

    // Modal Navigation
    function setupModalNavigation() {
        const prevBtn = document.getElementById('prevQuestion');
        const nextBtn = document.getElementById('nextQuestion');
        const modalCounter = document.getElementById('modalCounter');

        prevBtn?.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                openModal(currentQuestionsList[currentQuestionIndex]);
            }
        });

        nextBtn?.addEventListener('click', () => {
            if (currentQuestionIndex < currentQuestionsList.length - 1) {
                currentQuestionIndex++;
                openModal(currentQuestionsList[currentQuestionIndex]);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('active')) return;
            if (e.key === 'ArrowLeft') prevBtn?.click();
            if (e.key === 'ArrowRight') nextBtn?.click();
        });
    }

    function updateModalNavigation() {
        const prevBtn = document.getElementById('prevQuestion');
        const nextBtn = document.getElementById('nextQuestion');
        const modalCounter = document.getElementById('modalCounter');

        if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
        if (nextBtn) nextBtn.disabled = currentQuestionIndex === currentQuestionsList.length - 1;
        if (modalCounter) {
            modalCounter.textContent = `${currentQuestionIndex + 1} of ${currentQuestionsList.length}`;
        }
    }

    // Initialize modal navigation
    setupModalNavigation();
});
