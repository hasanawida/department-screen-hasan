# סרטון הסברה: המטומה בגיל המבוגר

סרטון אנכי (9:16, ‏1080×1920, ‏60fps, כ-1:46 דק׳) בעברית: איך תפיסה לא נכונה ומעברים (מיטה ← כיסא) גורמים לחבורה ולהמטומה בעור של אדם מבוגר, ואיך הם עלולים לגרום גם לשבר. בסוף: "בהמשך נלמד איך נכון".

## מבנה
| קובץ | מה יש בו |
|---|---|
| `script.json` | הקריינות, משפט לכל שורה (עם הפסקות ארוכות — קצב איטי) |
| `facts.md` | כל טענה רפואית בסרטון + מקור |
| `project.json` · `timeline.json` | הגדרות, וסדר הסצנות מסונכרן לקריינות (מילה-מילה) |
| `scenes/` | 10 סצנות: הוק, צלילה מתחת לעור, שכבות העור (3D), עור צעיר מול מבוגר, מעבר ותפיסה שגויה, היווצרות המטומה (3D), אוסטאופורוזיס, שבר (3D), סיכום, סיום |
| `lib/` | `skin.js` — גוש חתך תלת-ממדי של העור · `arm.js` — זרוע, כפפה וחבורות · `ui.js` — כתוביות, כותרות, תוויות |
| `sfx.json` · `sfx/` · `tools/mix.py` | עיצוב סאונד מספריות צלילים, מיקס ונרמול ל-‎-14 LUFS |

## בנייה מחדש
נבנה עם מנוע ה-motion של התוסף `majed-video` (Claude Code), עם שני תיקונים מקומיים: דגלי Chromium ללינוקס בלי GPU (`--no-sandbox --use-angle=swiftshader`) וזיהוי כיוון RTL גם לאותיות עבריות (טווח ‎U+0590–U+05FF).
```bash
tools/fetch_assets.sh                     # גופנים + צלילי Mixkit
python3 <engine>/motion/voice.py .        # קריינות (edge-tts, he-IL-AvriNeural)
python3 <engine>/motion/timeline.py .     # timeline.json + vo/vo_full.wav
node <engine>/motion/render.js . all      # פריימים → renders/video.mp4
python3 tools/mix.py .                    # קריינות + אפקטים → renders/final.mp4
```
