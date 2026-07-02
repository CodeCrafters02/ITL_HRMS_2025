import re

file_path = 'd:/Innovyx Project/ITL_HRMS_2025/free-react-tailwind-admin-dashboard-main/src/components/Layouts/Sidebar.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Resolve first conflict (Employee Sidebar)
first_conflict_pattern = re.compile(r'<<<<<<< HEAD\s+<>\s+<h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-\[0\.08\] -mx-4 mb-1">.*?=======.*?>>>>>>> 5d4ce94d96c12e7831cba3d13291b64c84ea8e9a', re.DOTALL)

# Let's inspect what is between <<<<<<< HEAD and ======= in the file to make sure it matches correctly
match = first_conflict_pattern.search(content)
if not match:
    # Try a simpler match for conflict 1
    first_conflict_pattern = re.compile(r'<<<<<<< HEAD.*?=======.*?>>>>>>> 5d4ce94d96c12e7831cba3d13291b64c84ea8e9a', re.DOTALL)

# Resolved version of conflict 1:
resolved_conflict_1 = """                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{isPerfPage ? t('Performance') : t('Employee Dashboard')}</span>
                                    </h2>

                                    {isPerfPage ? (
                                        <>
                                            {/* Performance Dashboard */}
                                            <li className="menu nav-item">
                                                <NavLink to="/employee/performance" end className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuCharts className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Performance Dashboard')}</span>
                                                    </div>
                                                </NavLink>
                                            </li>

                                            {/* Goals & KRAs */}
                                            <li className="menu nav-item">
                                                <button type="button" className={`${currentMenu === 'emp-perf-goals' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('emp-perf-goals')}>
                                                    <div className="flex items-center">
                                                        <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Goals & KRAs')}</span>
                                                    </div>
                                                    <div className={currentMenu !== 'emp-perf-goals' ? 'rtl:rotate-90 -rotate-90' : ''}><IconCaretDown /></div>
                                                </button>
                                                <AnimateHeight duration={300} height={currentMenu === 'emp-perf-goals' ? 'auto' : 0}>
                                                    <ul className="sub-menu text-gray-500">
                                                        <li><NavLink to="/employee/performance/kras">{t('My KRAs')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/self-map-kras">{t('Self Map KRAs')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/kra-review">{t('KRA Review')}</NavLink></li>
                                                    </ul>
                                                </AnimateHeight>
                                            </li>

                                            {/* Skills */}
                                            <li className="menu nav-item">
                                                <button type="button" className={`${currentMenu === 'emp-perf-skills' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('emp-perf-skills')}>
                                                    <div className="flex items-center">
                                                        <IconMenuTables className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Skills')}</span>
                                                    </div>
                                                    <div className={currentMenu !== 'emp-perf-skills' ? 'rtl:rotate-90 -rotate-90' : ''}><IconCaretDown /></div>
                                                </button>
                                                <AnimateHeight duration={300} height={currentMenu === 'emp-perf-skills' ? 'auto' : 0}>
                                                    <ul className="sub-menu text-gray-500">
                                                        <li><NavLink to="/employee/performance/competencies">{t('Competencies')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/skills-inventory">{t('Skills Inventory')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/skill-upgrades">{t('Skill Upgrades')}</NavLink></li>
                                                    </ul>
                                                </AnimateHeight>
                                            </li>

                                            {/* Feedback */}
                                            <li className="menu nav-item">
                                                <button type="button" className={`${currentMenu === 'emp-perf-feedback' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('emp-perf-feedback')}>
                                                    <div className="flex items-center">
                                                        <IconMenuChat className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Feedback')}</span>
                                                    </div>
                                                    <div className={currentMenu !== 'emp-perf-feedback' ? 'rtl:rotate-90 -rotate-90' : ''}><IconCaretDown /></div>
                                                </button>
                                                <AnimateHeight duration={300} height={currentMenu === 'emp-perf-feedback' ? 'auto' : 0}>
                                                    <ul className="sub-menu text-gray-500">
                                                        <li><NavLink to="/employee/performance/feedback-received">{t('Feedback Received')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/feedback-provided">{t('Feedback Provided')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/manager-direct-feedback">{t('Give Direct Feedback')}</NavLink></li>
                                                    </ul>
                                                </AnimateHeight>
                                            </li>

                                            {/* Appraisals */}
                                            <li className="menu nav-item">
                                                <button type="button" className={`${currentMenu === 'emp-perf-appraisal' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('emp-perf-appraisal')}>
                                                    <div className="flex items-center">
                                                        <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Appraisals')}</span>
                                                    </div>
                                                    <div className={currentMenu !== 'emp-perf-appraisal' ? 'rtl:rotate-90 -rotate-90' : ''}><IconCaretDown /></div>
                                                </button>
                                                <AnimateHeight duration={300} height={currentMenu === 'emp-perf-appraisal' ? 'auto' : 0}>
                                                    <ul className="sub-menu text-gray-500">
                                                        <li><NavLink to="/employee/performance/self-appraisal">{t('Self Appraisal')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/peer-appraisal">{t('Peer Appraisal')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/manager-appraisal">{t('Manager Appraisal')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/appraisal-history">{t('Appraisal History')}</NavLink></li>
                                                        <li><NavLink to="/employee/performance/extension-status">{t('Extension Status')}</NavLink></li>
                                                    </ul>
                                                </AnimateHeight>
                                            </li>

                                            {/* Back to main */}
                                            <li className="menu nav-item mt-2">
                                                <NavLink to="/employee/dashboard" className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('← Main Dashboard')}</span>
                                                    </div>
                                                </NavLink>
                                            </li>
                                        </>
                                    ) : ("""

content, count1 = first_conflict_pattern.subn(resolved_conflict_1, content)
print(f"Resolved employee conflict? Count = {count1}")

# 2. Resolve second conflict (Admin Sidebar)
second_conflict_pattern = re.compile(r'<<<<<<< HEAD\s+#.*?=======.*?>>>>>>> 5d4ce94d96c12e7831cba3d13291b64c84ea8e9a', re.DOTALL)
match2 = second_conflict_pattern.search(content)
if not match2:
    second_conflict_pattern = re.compile(r'<<<<<<< HEAD.*?=======.*?>>>>>>> 5d4ce94d96c12e7831cba3d13291b64c84ea8e9a', re.DOTALL)

# Resolved version of conflict 2:
resolved_conflict_2 = """                                                    {/* Group 4: CONTINUOUS REVIEW */}
                                                    <li className="menu nav-item">
                                                        <button type="button" className={`${currentMenu === 'adminContReview' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('adminContReview')}>
                                                            <div className="flex items-center">
                                                                <IconMenuChat className="group-hover:!text-primary shrink-0" />
                                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Continuous Review')}</span>
                                                            </div>
                                                            <div className={currentMenu !== 'adminContReview' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                                <IconCaretDown />
                                                            </div>
                                                        </button>
                                                        <AnimateHeight duration={300} height={currentMenu === 'adminContReview' ? 'auto' : 0}>
                                                            <ul className="sub-menu text-gray-500">
                                                                <li><NavLink to="/admin/performance/continuous-extensions">{t('Manage Extensions')}</NavLink></li>
                                                            </ul>
                                                        </AnimateHeight>
                                                    </li>

                                                    {/* Group 6: DATA UTILITIES & MULTI-RATER LOGS */}
                                                    <li className="menu nav-item">
                                                        <button type="button" className={`${currentMenu === 'adminDataUtils' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('adminDataUtils')}>
                                                            <div className="flex items-center">
                                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0" />
                                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Utilities & Logs')}</span>
                                                            </div>
                                                            <div className={currentMenu !== 'adminDataUtils' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                                <IconCaretDown />
                                                            </div>
                                                        </button>
                                                        <AnimateHeight duration={300} height={currentMenu === 'adminDataUtils' ? 'auto' : 0}>
                                                            <ul className="sub-menu text-gray-500">
                                                                <li><NavLink to="/admin/performance/export-module">{t('Reports & Analytics')}</NavLink></li>
                                                                <li><NavLink to="/admin/performance/multi-rater-log">{t('Multi-Rater Log')}</NavLink></li>
                                                            </ul>
                                                        </AnimateHeight>
                                                    </li>
                                                </>
                                            ) : ("""

content, count2 = second_conflict_pattern.subn(resolved_conflict_2, content)
print(f"Resolved admin conflict? Count = {count2}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Sidebar.tsx updated.")
