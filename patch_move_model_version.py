import os

target_path = "apps/web/src/app/admin/ai-settings/page.tsx"
if not os.path.exists("apps/web/src/app/admin/ai-settings"):
    target_path = "src/app/admin/ai-settings/page.tsx"

with open(target_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the 2-column grid containing API Key and Model Version Identifier with a vertical stack
old_grid = """              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>API Key</label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: isDayMode ? '#7e22ce' : '#c084fc' }}>
                      {provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                      placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                      className="settings-input w-full border rounded-xl px-4 py-3 pr-36 font-mono text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 transition cursor-pointer"
                        style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestApiKey}
                        disabled={testingKey}
                        className="px-2.5 py-1.5 rounded-lg text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-md disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                        title="Test API Key connection live"
                      >
                        {testingKey ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="h-3 w-3" />
                            <span>Test Connection</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div className={`mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in shadow-xs ${
                      testResult.success 
                        ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300')
                        : (isDayMode ? 'bg-red-50 border-red-300 text-red-900' : 'bg-red-950/60 border-red-500/50 text-red-300')
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{testResult.message}</span>
                    </div>
                  )}
                  <span className="text-[10px] mt-1 block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Saved locally and synced to disk environment on save.</span>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    Model Version Identifier
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 outline-none cursor-pointer transition font-medium"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    {provider === 'gemini' ? (
                      <>
                        <option value="gemini-3.6-flash" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>Gemini 3.6 Flash (Latest Recommended)</option>
                        <option value="gemini-3.5-flash-lite" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>Gemini 3.5 Flash Lite (Lightweight & Fast)</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4o" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-4o (Advanced reasoning)</option>
                        <option value="gpt-4-turbo" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-3.5 Turbo (High speed)</option>
                      </>
                    )}
                  </select>
                  <span className="text-[10px] mt-1 block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Active model endpoint used during AI prompt generation.</span>
                </div>
              </div>"""

new_stack = """              <div className="pt-2 space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>API Key</label>
                    <span className="text-[10px] font-mono font-bold" style={{ color: isDayMode ? '#7e22ce' : '#c084fc' }}>
                      {provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                      placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                      className="settings-input w-full border rounded-xl px-4 py-3 pr-36 font-mono text-xs outline-none transition"
                      style={{
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                        borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                        color: isDayMode ? '#0f172a' : '#ffffff'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 transition cursor-pointer"
                        style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}
                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestApiKey}
                        disabled={testingKey}
                        className="px-2.5 py-1.5 rounded-lg text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-md disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                        title="Test API Key connection live"
                      >
                        {testingKey ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="h-3 w-3" />
                            <span>Test Connection</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div className={`mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in shadow-xs ${
                      testResult.success 
                        ? (isDayMode ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300')
                        : (isDayMode ? 'bg-red-50 border-red-300 text-red-900' : 'bg-red-950/60 border-red-500/50 text-red-300')
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{testResult.message}</span>
                    </div>
                  )}
                  <span className="text-[10px] mt-1 block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Saved locally and synced to disk environment on save.</span>
                </div>

                <div>
                  <label className="block font-bold mb-1.5 uppercase tracking-wider text-[10px]" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    Model Version Identifier
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 outline-none cursor-pointer transition font-medium"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #0B101D)',
                      borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                      color: isDayMode ? '#0f172a' : '#ffffff'
                    }}
                  >
                    {provider === 'gemini' ? (
                      <>
                        <option value="gemini-3.6-flash" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>Gemini 3.6 Flash (Latest Recommended)</option>
                        <option value="gemini-3.5-flash-lite" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>Gemini 3.5 Flash Lite (Lightweight & Fast)</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4o" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-4o (Advanced reasoning)</option>
                        <option value="gpt-4-turbo" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo" style={{ backgroundColor: isDayMode ? '#ffffff' : '#0B101D', color: isDayMode ? '#0f172a' : '#ffffff' }}>GPT-3.5 Turbo (High speed)</option>
                      </>
                    )}
                  </select>
                  <span className="text-[10px] mt-1 block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Active model endpoint used during AI prompt generation.</span>
                </div>
              </div>"""

if old_grid in code:
    code = code.replace(old_grid, new_stack)
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("✅ Successfully moved 'Model Version Identifier' under 'API Key' field.")
else:
    print("⚠️ Could not find exact match for grid layout. Performing fallback update...")
