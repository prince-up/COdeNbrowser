import os
import re

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("in-memory-db.js", "database.js")
    
    # Exams
    content = re.sub(r'const exam = db\.getAuthoredExam\(', r'const exam = await db.getAuthoredExam(', content)
    content = re.sub(r'let exam = db\.getAuthoredExam\(', r'let exam = await db.getAuthoredExam(', content)
    content = re.sub(r'db\.saveAuthoredExam\(', r'await db.saveAuthoredExam(', content)
    content = content.replace('Array.from(db.authoredExams.values())', '(await db.getAuthoredExams())')
    
    # Submissions
    content = re.sub(r'db\.getSubmissions\(', r'await db.getSubmissions(', content)
    
    # Sessions
    content = content.replace('Array.from(db.activeSessions.values())', '(await db.getActiveSessions())')

    # Security Events
    content = content.replace('db.securityEvents;', '(await db.getSecurityEvents());')
    content = content.replace('db.securityEvents.filter', '(await db.getSecurityEvents()).filter')

    with open(filepath, 'w') as f:
        f.write(content)

base = "d:/SEB/packages/server/src"
replace_in_file(os.path.join(base, "routes/admin-routes.ts"))
replace_in_file(os.path.join(base, "routes/exam-routes.ts"))
replace_in_file(os.path.join(base, "routes/session-routes.ts"))
replace_in_file(os.path.join(base, "queue/submission-queue.ts"))
