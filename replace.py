import sys

with open('packages/server/public/admin/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

old_html = '''            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted);">Sample Test Case (Input / Expected Output):</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-top: 0.3rem;">
              <input type="text" class="input-field" value="$"{q.testCases[0]?.input || ''}$" oninput="authoredQuestions[$"{idx}$"].testCases[0].input = this.value" placeholder="Input" />
              <input type="text" class="input-field" value="$"{q.testCases[0]?.expectedOutput || ''}$" oninput="authoredQuestions[$"{idx}$"].testCases[0].expectedOutput = this.value" placeholder="Expected Output" />
            </div>'''

new_html = '''            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">Test Cases:</div>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              $"{q.testCases.map((tc, tcIdx) => \
                <div style="background: var(--bg-card); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--border); position: relative;">
                  <button onclick="removeTestCase($"{idx}$", $"{tcIdx}$")" style="position: absolute; right: 0.5rem; top: 0.5rem; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 0.2rem;">&times;</button>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                    <textarea class="input-field" style="height: 80px; font-family: monospace; font-size: 0.85rem;" oninput="authoredQuestions[$"{idx}$"].testCases[$"{tcIdx}$"].input = this.value" placeholder="Input (supports multiple lines)">$"{tc.input}$"</textarea>
                    <textarea class="input-field" style="height: 80px; font-family: monospace; font-size: 0.85rem;" oninput="authoredQuestions[$"{idx}$"].testCases[$"{tcIdx}$"].expectedOutput = this.value" placeholder="Expected Output (supports multiple lines)">$"{tc.expectedOutput}$"</textarea>
                  </div>
                  <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-main);">
                    <input type="checkbox" style="width: 14px; height: 14px; accent-color: var(--accent);" onchange="authoredQuestions[$"{idx}$"].testCases[$"{tcIdx}$"].isHidden = this.checked" $"{tc.isHidden ? 'checked' : ''}$" />
                    Hidden Test Case (Not shown to student during exam, used for final grading)
                  </div>
                </div>
              \).join('')}
            </div>
            <button class="btn btn-secondary" style="margin-top: 0.75rem; font-size: 0.8rem; padding: 0.4rem 0.8rem; background: #334155; border: none; color: white;" onclick="addTestCase($"{idx}$")">+ Add Another Test Case</button>'''

new_html = new_html.replace('$"', '$')
old_html = old_html.replace('$"', '$')

text = text.replace('\r\n', '\n')
old_html = old_html.replace('\r\n', '\n')

if old_html in text:
    text = text.replace(old_html, new_html)
    with open('packages/server/public/admin/index.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Replaced successfully')
else:
    print('Target not found')
