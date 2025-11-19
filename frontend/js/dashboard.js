/*=====================================================================
  js/dashboard.js
  DashboardController – full page logic (upload, analysis, UI, chat…)
=====================================================================*/

class DashboardController {
  constructor() {
    this.currentAnalysis = null;
    this.currentSessionId = null;
    this.selectedFile = null;
    this.init();
  }

  /*---------------------------------------------------------------*/
  /*  Init                                                         */
  /*---------------------------------------------------------------*/
  init() {
    // Auth guard
    if (!api.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    this.setupUI();
    this.setupEventListeners();
    this.loadDashboardData();
    lucide.createIcons();
  }

  /*---------------------------------------------------------------*/
  /*  UI setup                                                     */
  /*---------------------------------------------------------------*/
  setupUI() {
    const user = api.getCurrentUser();
    if (user) {
      document.getElementById('userName').textContent = user.name || user.email.split('@')[0];
      document.getElementById('userAvatar').textContent = (user.name || user.email).charAt(0).toUpperCase();
    }

    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /*---------------------------------------------------------------*/
  /*  Event listeners                                              */
  /*---------------------------------------------------------------*/
  setupEventListeners() {
    this.setupFileUploadEvents();
    this.setupUIEvents();
    this.setupChatEvents();
  }

  /* ---------- File upload ---------- */
  setupFileUploadEvents() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const removeBtn = document.getElementById('removeFile');

    // Drag & drop
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', e => { e.preventDefault(); uploadArea.classList.remove('dragover'); });
    uploadArea.addEventListener('drop', e => {
      e.preventDefault(); uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.handleFile(e.dataTransfer.files[0]);
    });

    // Click to open
    uploadArea.addEventListener('click', () => fileInput.click());
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => e.target.files[0] && this.handleFile(e.target.files[0]));
    removeBtn.addEventListener('click', () => this.removeFile());
    analyzeBtn.addEventListener('click', () => this.analyzeFile());
  }

  /* ---------- General UI ---------- */
  setupUIEvents() {
    document.getElementById('userMenuBtn').addEventListener('click', () => this.toggleUserMenu());
    document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    document.getElementById('sampleDataBtn').addEventListener('click', () => this.showSampleModal());
    document.getElementById('closeSampleModal').addEventListener('click', () => this.hideSampleModal());
    document.getElementById('closeToast').addEventListener('click', () => this.hideToast());

    // Close dropdown / modal on outside click
    document.addEventListener('click', e => this.handleOutsideClick(e));
  }

  /* ---------- Chat ---------- */
  setupChatEvents() {
    const input = document.getElementById('chatInput');
    const send = document.getElementById('sendChatBtn');
    const clear = document.getElementById('clearChatBtn');

    send.addEventListener('click', () => this.sendChatMessage());
    clear.addEventListener('click', () => this.clearChat());
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
    });
  }

  /*---------------------------------------------------------------*/
  /*  File handling                                                */
  /*---------------------------------------------------------------*/
  handleFile(file) {
    const valid = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                   'application/vnd.ms-excel', 'text/csv'];
    if (!valid.includes(file.type) && !/\.(xlsx|xls|csv)$/i.test(file.name)) {
      this.showToast('Please select a valid Excel or CSV file', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('File size must be less than 10 MB', 'error');
      return;
    }

    this.selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('analyzeBtn').classList.remove('hidden');
    document.getElementById('analyzeBtn').disabled = false;
    this.showToast('File selected successfully', 'success');
  }

  removeFile() {
    this.selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('analyzeBtn').classList.add('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
  }

  /*---------------------------------------------------------------*/
  /*  Analysis                                                     */
  /*---------------------------------------------------------------*/
  async analyzeFile() {
    if (!this.selectedFile) return;

    const analyzeBtn = document.getElementById('analyzeBtn');
    const txt = document.getElementById('analyzeText');
    const spinner = document.getElementById('analyzeSpinner');
    const prog = document.getElementById('uploadProgress');
    const bar = document.getElementById('progressBar');
    const pct = document.getElementById('progressPercent');

    try {
      analyzeBtn.disabled = true;
      txt.textContent = 'Analyzing...';
      spinner.classList.remove('hidden');
      prog.classList.remove('hidden');

      const result = await api.analyzeFile(this.selectedFile, p => {
        bar.style.width = `${p}%`;
        pct.textContent = `${Math.round(p)}%`;
      });

      if (result.success) {
        this.currentAnalysis = result;
        this.currentSessionId = result.sessionId;
        this.displayResults(result);
        this.updateStats();
        this.updateChatStatus(true);
        this.showToast('Analysis completed successfully!', 'success');
        this.addRecentActivity('File Analyzed', this.selectedFile.name);
        this.saveAnalysisToHistory(result);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (err) {
      console.error(err);
      this.showToast(err.message || 'Analysis failed. Please try again.', 'error');
    } finally {
      analyzeBtn.disabled = false;
      txt.textContent = 'Analyze Data';
      spinner.classList.add('hidden');
      prog.classList.add('hidden');
    }
  }

  /*---------------------------------------------------------------*/
  /*  Render results (merged from old DashboardManager)           */
  /*---------------------------------------------------------------*/
  displayResults(data) {
    const container = document.getElementById('resultsSection');
    const totalStudents = data.totalStudents || 0;
    const totalSubjects = data.totalSubjects || 0;
    const a = data.analysisResults || {};
    const oa = a.overallAssessment || {};
    const insights = a.insights || [];
    const individuals = a.individualInsights || [];
    const patterns = a.patterns || {};
    const recommendations = a.recommendations || {};
    const aiPowered = data.aiPowered !== false;
    const analysisType = data.analysisType || (aiPowered ? 'AI-Powered' : 'Rule-Based');

    const html = `
      <div class="card animate-fade-in">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Analysis Results</h2>
            <div class="flex items-center space-x-2 mt-2">
              ${aiPowered ? `
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  ${analysisType}
                </span>
              ` : `
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  ${analysisType}
                </span>
                <span class="text-xs text-gray-500">⚙️ Configure GEMINI_API_KEY for AI insights</span>
              `}
            </div>
          </div>
          <div class="flex space-x-2">
            <button class="btn-secondary" onclick="window.open('${data.downloadUrl || '#'}','_blank')">
              <i data-lucide="download" class="w-4 h-4 mr-2"></i> Download PDF
            </button>
            <button class="btn-secondary"><i data-lucide="share-2" class="w-4 h-4 mr-2"></i> Share</button>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="analysis-metric">
            <div class="flex items-center justify-between">
              <div><h3 class="text-sm font-semibold text-blue-900 mb-1">Total Students</h3>
                <p class="text-3xl font-bold text-blue-600">${totalStudents}</p></div>
              <i data-lucide="users" class="w-8 h-8 text-blue-500"></i>
            </div>
          </div>
          <div class="analysis-metric bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div class="flex items-center justify-between">
              <div><h3 class="text-sm font-semibold text-green-900 mb-1">Total Subjects</h3>
                <p class="text-3xl font-bold text-green-600">${totalSubjects}</p></div>
              <i data-lucide="book-open" class="w-8 h-8 text-green-500"></i>
            </div>
          </div>
          <div class="analysis-metric bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <div class="flex items-center justify-between">
              <div><h3 class="text-sm font-semibold text-purple-900 mb-1">Class Grade</h3>
                <p class="text-3xl font-bold text-purple-600">${oa.classGrade || 'N/A'}</p></div>
              <i data-lucide="award" class="w-8 h-8 text-purple-500"></i>
            </div>
          </div>
        </div>

        ${this.renderOverallAssessment(oa)}
        ${this.renderInsightsSection(insights)}
        ${this.renderIndividualInsights(individuals)}
        ${this.renderPatternsSection(patterns)}
        ${this.renderRecommendationsSection(recommendations)}
      </div>`;

    container.innerHTML = html;
    container.classList.remove('hidden');
    lucide.createIcons();
  }

  /* ----- render helpers (same logic as before) ----- */
  renderOverallAssessment(a) {
    if (!a?.summary) return '';
    return `
      <div class="analysis-section mb-8">
        <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i data-lucide="clipboard-check" class="w-6 h-6 mr-2 text-blue-600"></i> Overall Assessment
        </h3>
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="text-center"><p class="text-2xl font-bold text-blue-600">${a.classGrade||'N/A'}</p><p class="text-sm text-blue-800">Class Grade</p></div>
            <div class="text-center"><p class="text-2xl font-bold text-blue-600">${a.averageScore||'N/A'}</p><p class="text-sm text-blue-800">Average Score</p></div>
            <div class="text-center"><p class="text-2xl font-bold text-blue-600">${a.totalStudents||'N/A'}</p><p class="text-sm text-blue-800">Students</p></div>
          </div>
          <p class="text-gray-800">${a.summary}</p>
        </div>
      </div>`;
  }

  renderInsightsSection(list) {
    if (!list?.length) return '';
    return `
      <div class="analysis-section mb-8">
        <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i data-lucide="lightbulb" class="w-6 h-6 mr-2 text-yellow-600"></i> Key Insights
        </h3>
        <div class="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
          <div class="space-y-3">
            ${list.map((i, idx) => `<div class="flex items-start space-x-3">
              <div class="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">${idx+1}</div>
              <p class="text-gray-800">${i}</p>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
  }

renderIndividualInsights(list) {
  if (!list?.length) return '';

  return `
    <div class="analysis-section mb-8">
      <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <i data-lucide="user-check" class="w-6 h-6 mr-2 text-green-600"></i> Individual Student Insights
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${list.slice(0, 6).map(s => {
          // Helper to safely turn any array (including objects) into a readable string
          const formatArray = arr => Array.isArray(arr)
            ? arr.map(item => typeof item === 'object' ? JSON.stringify(item) : item).join(', ')
            : '';

          const strengths = formatArray(s.strengths);
          const concerns  = formatArray(s.concerns);
          const actions   = formatArray(s.actions || s.recommendations); // some APIs use "recommendations"

          // Use courseRecommendations if available, fallback to recommendations
          const courseRecs = s.courseRecommendations || s.recommendations || [];
          const hasDetailedCourses = courseRecs.length > 0 && typeof courseRecs[0] === 'object' && courseRecs[0].course;

          return `
            <div class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50 to-white">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-gray-900">${s.studentName || 'Student'}</h4>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${s.averageScore || 'N/A'}</span>
              </div>

              <div class="space-y-2 text-sm">
                ${strengths ? `<div><span class="text-green-600 font-medium">💪 Strengths:</span> <span class="text-gray-700">${strengths}</span></div>` : ''}
                ${s.insight ? `<div class="mt-2 p-2 bg-blue-50 rounded-lg"><span class="text-blue-600 font-medium">💡 Insight:</span> <span class="text-gray-700">${s.insight}</span></div>` : ''}
                ${concerns  ? `<div><span class="text-red-600 font-medium">⚠️ Concerns:</span> <span class="text-gray-700">${concerns}</span></div>` : ''}
                ${hasDetailedCourses ? `
                  <div class="mt-4 space-y-3">
                    <div class="font-medium text-purple-600 mb-2 flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                      </svg>
                      Recommended University Courses:
                    </div>
                    ${courseRecs.map((rec, idx) => `
                      <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between mb-2">
                          <div class="flex items-start space-x-2">
                            <span class="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              ${idx + 1}
                            </span>
                            <div>
                              <h5 class="font-bold text-gray-900 text-sm">${rec.course}</h5>
                              <p class="text-xs text-gray-600 mt-1">
                                <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                ${rec.university}
                              </p>
                            </div>
                          </div>
                          <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                            JAMB: ${rec.jamb_cutoff}
                          </span>
                        </div>
                        <div class="ml-7">
                          <p class="text-xs text-gray-700 mb-1">
                            <svg class="w-3 h-3 inline mr-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            ${rec.reason}
                          </p>
                          <p class="text-xs text-gray-600">
                            <span class="font-medium">📋 WAEC Required:</span> ${rec.waec_required}
                          </p>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : courseRecs.length > 0 ? `
                  <div class="mt-3">
                    <div class="font-medium text-purple-600 mb-1">Recommendations:</div>
                    <ul class="text-xs text-gray-700 list-disc list-inside space-y-1">
                      ${courseRecs.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>

      ${list.length > 6 ? `
        <div class="text-center mt-4">
          <button class="btn-secondary">
            <i data-lucide="more-horizontal" class="w-4 h-4 mr-2"></i> View All ${list.length} Students
          </button>
        </div>` : ''}
    </div>`;
}

  renderPatternsSection(p) {
    if (!p || (!p.strengths?.length && !p.weaknesses?.length && !p.trends?.length)) return '';
    return `
      <div class="analysis-section mb-8">
        <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i data-lucide="trending-up" class="w-6 h-6 mr-2 text-indigo-600"></i> Performance Patterns
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${p.strengths?.length ? `<div class="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4"><h4 class="font-semibold text-green-900 mb-2 flex items-center"><i data-lucide="trending-up" class="w-4 h-4 mr-2"></i>Strengths</h4><ul class="space-y-1">${p.strengths.map(t=>`<li class="text-sm text-green-800">• ${t}</li>`).join('')}</ul></div>` : ''}
          ${p.weaknesses?.length ? `<div class="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-4"><h4 class="font-semibold text-red-900 mb-2 flex items-center"><i data-lucide="trending-down" class="w-4 h-4 mr-2"></i>Areas for Improvement</h4><ul class="space-y-1">${p.weaknesses.map(t=>`<li class="text-sm text-red-800">• ${t}</li>`).join('')}</ul></div>` : ''}
          ${p.trends?.length ? `<div class="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4"><h4 class="font-semibold text-purple-900 mb-2 flex items-center"><i data-lucide="activity" class="w-4 h-4 mr-2"></i>Trends</h4><ul class="space-y-1">${p.trends.map(t=>`<li class="text-sm text-purple-800">• ${t}</li>`).join('')}</ul></div>` : ''}
        </div>
      </div>`;
  }

  renderRecommendationsSection(r) {
    if (!r) return '';
    const sections = [
      {key:'immediate', title:'Immediate Actions', color:'red', icon:'alert-circle'},
      {key:'shortTerm', title:'Short Term Goals', color:'yellow', icon:'clock'},
      {key:'longTerm', title:'Long Term Strategy', color:'green', icon:'target'}
    ];
    return `
      <div class="analysis-section">
        <h3 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i data-lucide="target" class="w-6 h-6 mr-2 text-green-600"></i> Recommendations
        </h3>
        <div class="space-y-4">
          ${sections.map(s => {
            const items = r[s.key];
            if (!items?.length) return '';
            return `<div class="bg-${s.color}-50 border border-${s.color}-200 rounded-xl p-6">
              <h4 class="font-semibold text-${s.color}-900 mb-3 flex items-center">
                <i data-lucide="${s.icon}" class="w-5 h-5 mr-2"></i>${s.title}
              </h4>
              <ul class="space-y-2">
                ${items.map(i=>`<li class="flex items-start space-x-2 text-${s.color}-800"><i data-lucide="check" class="w-4 h-4 mt-0.5 text-${s.color}-600"></i><span>${i}</span></li>`).join('')}
              </ul>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /*---------------------------------------------------------------*/
  /*  Chat                                                         */
  /*---------------------------------------------------------------*/
  updateChatStatus(hasAnalysis) {
    const container = document.getElementById('chatContainer');
    const statusHtml = hasAnalysis 
      ? `<div class="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
           <div class="flex items-center justify-center space-x-2">
             <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <p class="text-sm text-green-800 font-medium">Connected to analysis data</p>
           </div>
           <p class="text-xs text-green-600 mt-1">Ask me anything about the analyzed data!</p>
         </div>`
      : `<div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
           <p class="text-sm text-blue-800 font-medium">💬 General Assistant Mode</p>
           <p class="text-xs text-blue-600 mt-1">Upload data to get specific insights</p>
         </div>`;
    
    // Remove any existing status message
    const existingStatus = container.querySelector('.mb-3.p-3.bg-green-50, .mb-3.p-3.bg-blue-50');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    // Add new status at the top
    container.insertAdjacentHTML('afterbegin', statusHtml);
  }

  async sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    this.addChatMessage('user', msg);
    input.value = '';
    this.showChatTyping(true);

    try {
      const resp = await api.sendChatMessage(msg, this.currentSessionId);
      if (resp.success) {
        const message = resp.message || resp.response;
        const hasContext = resp.hasAnalysisContext;
        this.addChatMessage('assistant', message, { ...resp, hasAnalysisContext: hasContext });
      } else {
        this.addChatMessage('system', 'Sorry, something went wrong.');
      }
    } catch (e) {
      this.addChatMessage('system', `Error: ${e.message}`);
    } finally {
      this.showChatTyping(false);
    }
  }

  addChatMessage(type, content, extras = {}) {
    const container = document.getElementById('chatContainer');
    const empty = container.querySelector('.text-center');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'animate-fade-in';

    if (type === 'user') {
      div.innerHTML = `
        <div class="chat-message-user">
          <div class="chat-bubble-user">
            <p class="text-sm">${this.escapeHtml(content)}</p>
            <p class="text-xs text-blue-100 mt-1">${new Date().toLocaleTimeString()}</p>
          </div>
        </div>`;
    } else if (type === 'assistant') {
      div.innerHTML = `
        <div class="chat-message-assistant">
          <div class="chat-bubble-assistant">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <div class="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                  <i data-lucide="brain" class="w-3 h-3 text-white"></i>
                </div>
                <span class="text-xs text-gray-500 font-medium">EDU_AID</span>
              </div>
              ${extras.hasAnalysisContext ? `<span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">📊 Data-aware</span>` : ''}
            </div>
            <p class="text-sm text-gray-800 mb-2">${this.escapeHtml(content)}</p>
            ${extras.insights?.length ? `<div class="mt-3 p-2 bg-purple-50 rounded-lg border-l-2 border-purple-300">
              <p class="text-xs font-semibold text-purple-800 mb-1">Key Insights:</p>
              <ul class="text-xs text-purple-700 space-y-1">${extras.insights.map(i=>`<li>• ${this.escapeHtml(i)}</li>`).join('')}</ul>
            </div>` : ''}
            ${extras.followUpQuestions?.length ? `<div class="mt-3 flex flex-wrap gap-1">
              ${extras.followUpQuestions.map(q=>`<button class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                onclick="document.getElementById('chatInput').value='${this.escapeHtml(q)}';document.getElementById('chatInput').focus();">${this.escapeHtml(q)}</button>`).join('')}
            </div>` : ''}
            <p class="text-xs text-gray-400 mt-2">${new Date().toLocaleTimeString()}</p>
          </div>
        </div>`;
    } else {
      div.innerHTML = `<div class="flex justify-center"><div class="px-3 py-1 bg-red-100 border border-red-300 rounded-full"><p class="text-xs text-red-700">${this.escapeHtml(content)}</p></div></div>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
  }

  showChatTyping(flag) {
    const typing = document.getElementById('chatTyping');
    const btn = document.getElementById('sendChatBtn');
    typing.classList.toggle('hidden', !flag);
    btn.disabled = flag;
  }

  async clearChat() {
    try {
      await api.clearChatHistory();
      document.getElementById('chatContainer').innerHTML = `
        <div class="text-center text-gray-500 text-sm py-8">
          <i data-lucide="message-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          <p>Start a conversation with the AI assistant</p>
        </div>`;
      this.showToast('Chat history cleared', 'success');
      lucide.createIcons();
    } catch (e) { this.showToast('Failed to clear chat', 'error'); }
  }

  /*---------------------------------------------------------------*/
  /*  Stats / Recent activity / History                           */
  /*---------------------------------------------------------------*/
  updateStats() {
    // simple mock – replace with real API if you have one
    document.getElementById('totalAnalyses').textContent = Math.floor(Math.random() * 50) + 10;
    document.getElementById('studentsAnalyzed').textContent = Math.floor(Math.random() * 500) + 100;
    document.getElementById('aiInsights').textContent = Math.floor(Math.random() * 25) + 5;
    document.getElementById('averageScore').textContent = (75 + Math.random() * 20).toFixed(1) + '%';
  }

  addRecentActivity(type, desc) {
    const list = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    list.unshift({ type, description: desc, timestamp: new Date().toISOString() });
    localStorage.setItem('recentActivities', JSON.stringify(list.slice(0, 10)));
    this.loadRecentActivity();
  }

  saveAnalysisToHistory(result) {
    const hist = JSON.parse(localStorage.getItem('analysis_history') || '[]');
    const rec = {
      sessionId: result.sessionId,
      fileName: this.selectedFile.name,
      fileSize: this.selectedFile.size,
      totalStudents: result.totalStudents,
      totalSubjects: result.totalSubjects,
      analysisResults: result.analysisResults,
      overallAssessment: result.overallAssessment,
      individualInsights: result.individualInsights,
      patterns: result.patterns,
      recommendations: result.recommendations,
      insights: result.insights,
      confidence: result.confidence,
      timestamp: result.timestamp || new Date().toISOString(),
      downloadUrl: result.downloadUrl,
      isFavorite: false
    };
    hist.unshift(rec);
    localStorage.setItem('analysis_history', JSON.stringify(hist.slice(0, 50)));
  }

  loadRecentActivity() {
    const list = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    const container = document.getElementById('recentActivity');
    if (!list.length) {
      container.innerHTML = `<div class="text-center text-gray-500 text-sm py-4">
        <i data-lucide="clock" class="w-6 h-6 mx-auto mb-2 opacity-50"></i><p>No recent activity</p>
      </div>`;
      lucide.createIcons(); return;
    }
    container.innerHTML = list.map(a => `
      <div class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50/80 transition-colors">
        <div class="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">${a.type}</p>
          <p class="text-xs text-gray-500 truncate">${a.description}</p>
        </div>
        <div class="text-xs text-gray-400">${this.formatTimeAgo(a.timestamp)}</div>
      </div>`).join('');
    lucide.createIcons();
  }

  async loadDashboardData() {
    try { await api.healthCheck(); } catch (e) { console.warn('Health check failed', e); }
    this.updateStats();
    this.loadRecentActivity();
    this.updateChatStatus(false);
  }

  /*---------------------------------------------------------------*/
  /*  UI helpers                                                   */
  /*---------------------------------------------------------------*/
  toggleUserMenu() { document.getElementById('userDropdown').classList.toggle('hidden'); }
  logout() { api.logout(); window.location.href = 'login.html'; }
  showSampleModal() { document.getElementById('sampleModal').classList.remove('hidden'); }
  hideSampleModal() { document.getElementById('sampleModal').classList.add('hidden'); }

  handleOutsideClick(e) {
    const dropdown = document.getElementById('userDropdown');
    const btn = document.getElementById('userMenuBtn');
    const modal = document.getElementById('sampleModal');
    if (!btn.contains(e.target)) dropdown.classList.add('hidden');
    if (e.target === modal) this.hideSampleModal();
  }

  showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const txt = document.getElementById('toastMessage');
    const cfg = {
      success: {i:'check-circle', c:'text-green-600'},
      error:   {i:'x-circle',      c:'text-red-600'},
      warning: {i:'alert-triangle',c:'text-yellow-600'},
      info:    {i:'info',          c:'text-blue-600'}
    };
    const {i,c} = cfg[type] || cfg.info;
    txt.textContent = msg;
    icon.innerHTML = `<i data-lucide="${i}" class="w-5 h-5 ${c}"></i>`;
    toast.classList.remove('hidden','toast-enter');
    toast.classList.add('toast-enter-active');
    setTimeout(() => this.hideToast(), 5000);
    lucide.createIcons();
  }

  hideToast() {
    const t = document.getElementById('toast');
    t.classList.remove('toast-enter-active');
    t.classList.add('toast-enter');
    setTimeout(() => t.classList.add('hidden'), 300);
  }

  /*---------------------------------------------------------------*/
  /*  Utilities                                                    */
  /*---------------------------------------------------------------*/
  formatFileSize(b) {
    if (!b) return '0 Bytes';
    const k = 1024, s = ['Bytes','KB','MB','GB'], i = Math.floor(Math.log(b)/Math.log(k));
    return parseFloat((b/Math.pow(k,i)).toFixed(2)) + ' ' + s[i];
  }

  formatTimeAgo(ts) {
    const diff = Date.now() - new Date(ts);
    const m = Math.floor(diff/60000);
    const h = Math.floor(diff/3600000);
    const d = Math.floor(diff/86400000);
    return d>0 ? `${d}d ago` : h>0 ? `${h}h ago` : m>0 ? `${m}m ago` : 'Just now';
  }

  escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }
}

/*=====================================================================
  Initialise
=====================================================================*/
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new DashboardController();
});