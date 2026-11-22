#!/usr/bin/env python3
"""Generate AV-174 publication PDF from the repository's verification record."""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from xml.sax.saxutils import escape
import re
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'docs'/'AV-174-playability-verification.md'
DEST=ROOT/'docs'/'AV-174-playability-verification.pdf'
def build():
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name='AVTitle',parent=styles['Title'],fontName='Helvetica-Bold',fontSize=20,leading=25,textColor=colors.HexColor('#47267f'),spaceAfter=14))
    styles.add(ParagraphStyle(name='AVHeading',parent=styles['Heading2'],fontSize=12,leading=16,textColor=colors.HexColor('#a94b14'),spaceBefore=14,spaceAfter=6))
    styles.add(ParagraphStyle(name='AVBody',parent=styles['BodyText'],fontSize=9,leading=13,spaceAfter=7))
    styles.add(ParagraphStyle(name='AVSmall',parent=styles['BodyText'],fontSize=7.3,leading=10))
    story=[]
    lines=SOURCE.read_text(encoding='utf-8').splitlines()
    for line in lines:
        s=line.strip()
        if not s: continue
        if s.startswith('|'):
            continue
        if s.startswith('# '):
            story.append(Paragraph(escape(s[2:]),styles['AVTitle']))
            continue
        if s.startswith('## '):
            story.append(Paragraph(escape(s[3:]),styles['AVHeading']))
            continue
        if s.startswith('> '): s=s[2:]
        s=escape(s).replace('**','')
        story.append(Paragraph(s,styles['AVBody']))
    # Fixed-width summary of browser gates: source table remains in Markdown for exact details
    gate_data=[['GATE','PASS CRITERION','STATUS'],
               ['ROM initialization','Cartridge renders game screen','Unverified'],
               ['Frame progression','Actual frames advance','Unverified'],
               ['START input','Transition into gameplay','Unverified'],
               ['Game-over recovery','Resume frames after loss/reset','Unverified']]
    t=Table(gate_data,colWidths=[115,275,110],repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#39215b')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#c9b6d3')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#faf5ef')]),('FONTSIZE',(0,0),(-1,-1),8),('LEADING',(0,0),(-1,-1),11),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('BOTTOMPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8)]))
    story.insert(5,t)
    DEST.parent.mkdir(parents=True,exist_ok=True)
    doc=SimpleDocTemplate(str(DEST),pagesize=letter,rightMargin=50,leftMargin=50,topMargin=48,bottomMargin=50,title='Jane EMU AV-174 Playability Verification',author='Jane EMU project')
    def footer(canvas,doc):
        canvas.setFont('Helvetica',8)
        canvas.setFillColor(colors.HexColor('#666666'))
        canvas.drawString(50,28,'AV-174  |  Browser gameplay remains unverified')
        canvas.drawRightString(562,28,str(doc.page))
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    print(DEST)
if __name__=='__main__':build()
