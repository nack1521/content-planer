#!/usr/bin/env python3
import sys
import zipfile
import xml.etree.ElementTree as ET
import csv
import json
import re
import hashlib
from datetime import datetime, timedelta

def parse_excel(excel_path):
    z = zipfile.ZipFile(excel_path)
    
    # Read shared strings
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in sst.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
            if t is not None and t.text:
                shared_strings.append(t.text)
            else:
                text_parts = [p.text for p in si.findall('./{http://schemas.openxmlformats.org/spreadsheetml/2006/main}r/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if p.text]
                shared_strings.append(''.join(text_parts))
                
    # Read relationships for hyperlinks in sheet1
    rels = {}
    if 'xl/worksheets/_rels/sheet1.xml.rels' in z.namelist():
        rt = ET.fromstring(z.read('xl/worksheets/_rels/sheet1.xml.rels'))
        for rel in rt.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
            rid = rel.attrib.get('Id')
            target = rel.attrib.get('Target')
            rels[rid] = target

    # Read sheet1
    sheet1 = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    
    # Map cell to hyperlink
    cell_hyperlinks = {}
    for hl in sheet1.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}hyperlinks/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}hyperlink'):
        ref = hl.attrib.get('ref')
        rid = hl.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        if ref and rid in rels:
            cell_hyperlinks[ref] = rels[rid]
            
    rows = sheet1.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
    
    auto_candidates = []
    incomplete_rows = []
    placeholder_rows = []
    date_reviews = []
    all_links = []
    
    current_month_str = 'June'
    month_map = {
        'june': 6,
        'july': 7,
        'august': 8,
        'september': 9,
        'october': 10,
        'november': 11,
        'december': 12,
        'january': 1,
        'february': 2,
        'march': 3,
        'april': 4,
        'may': 5,
    }

    # Data starts around row 4 (headers on row 3)
    for r in rows:
        row_num = int(r.attrib.get('r', 0))
        if row_num < 3:
            continue
            
        cells = {}
        for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            ref = c.attrib.get('r')
            col = ''.join(filter(str.isalpha, ref))
            t = c.attrib.get('t')
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit():
                val = shared_strings[int(val)]
            cells[col] = val.strip()
            
        # Check for month header
        month_cell = cells.get('B', '')
        if month_cell and month_cell.lower() in month_map:
            current_month_str = month_cell
            
        num_raw = cells.get('A', '')
        objective = cells.get('C', '')
        platform_str = cells.get('D', '')
        format_str = cells.get('E', '')
        topic = cells.get('F', '')
        hook = cells.get('G', '')
        detail = cells.get('H', '')
        cta = cells.get('I', '')
        content_checking = cells.get('K', '')
        content_status = cells.get('O', '')
        publish_date_raw = cells.get('P', '')
        note = cells.get('Q', '')
        
        # Check embedded hyperlinks for this row
        row_links = []
        for col_letter in ['F', 'J', 'L', 'M', 'N', 'Q']:
            cell_ref = f"{col_letter}{row_num}"
            if cell_ref in cell_hyperlinks:
                url = cell_hyperlinks[cell_ref]
                link_type = (
                    'idea_source' if col_letter == 'F'
                    else ('asset' if col_letter == 'J'
                    else ('published' if col_letter in ['L', 'M', 'N']
                    else 'note'))
                )
                plat = (
                    'tiktok' if col_letter == 'L'
                    else ('youtube' if col_letter == 'M'
                    else ('facebook' if col_letter == 'N' else None))
                )
                # For column N ("URL FB, IG"), label clearly as "FB, IG" to preserve combined meaning
                link_label = 'FB, IG' if col_letter == 'N' else cells.get(col_letter, '')
                link_obj = {
                    'source_number': int(num_raw) if num_raw.isdigit() else row_num,
                    'cell': cell_ref,
                    'link_type': link_type,
                    'platform': plat,
                    'url': url,
                    'label': link_label or None
                }
                row_links.append(link_obj)
                all_links.append(link_obj)
                
        # Classify row
        if not num_raw:
            continue
        try:
            num = int(float(num_raw))
        except (ValueError, TypeError):
            continue
        has_content = bool(topic or hook or detail)
        
        if not has_content:
            if cta or note or row_links:
                incomplete_rows.append({
                    'row_index': row_num,
                    'source_number': num,
                    'reason': 'CTA or links provided but missing idea/hook',
                    'cta': cta,
                    'format': format_str,
                    'platforms': platform_str
                })
            else:
                placeholder_rows.append({
                    'row_index': row_num,
                    'source_number': num
                })
            continue
            
        # Parse platforms
        platforms = []
        p_upper = platform_str.upper()
        if 'TT' in p_upper or 'TIKTOK' in p_upper:
            platforms.append('tiktok')
        if 'YT' in p_upper or 'YOUTUBE' in p_upper:
            platforms.append('youtube')
        if 'FB' in p_upper or 'FACEBOOK' in p_upper:
            platforms.append('facebook')
        if 'IG' in p_upper or 'INSTAGRAM' in p_upper:
            platforms.append('instagram')
        if not platforms:
            platforms = ['tiktok']
            
        # Parse format - preserve null if unassigned
        fmt = None
        f_lower = format_str.lower()
        if 'short' in f_lower or 'video' in f_lower:
            fmt = 'short'
        elif 'photo' in f_lower or 'รูป' in f_lower:
            fmt = 'photo'
        elif 'carousel' in f_lower:
            fmt = 'carousel'
        elif 'infographic' in f_lower:
            fmt = 'infographic'
        elif 'story' in f_lower:
            fmt = 'story'
        elif 'long' in f_lower:
            fmt = 'long'
            
        # Parse review status
        rev_status = None
        c_check_lower = content_checking.lower()
        if 'approve' in c_check_lower:
            rev_status = 'approved'
        elif 'revise' in c_check_lower or 'edit' in c_check_lower:
            rev_status = 'revise'
            
        # Parse workflow status
        wf_status = 'scripting'
        progress = 40
        if content_status.lower() == 'publish':
            wf_status = 'published'
            progress = 100
            
        # Parse publication date & review
        expected_month = month_map.get(current_month_str.lower(), None)
        parsed_iso_date = None
        date_warning = 'OK'
        
        if not publish_date_raw:
            if content_status.lower() == 'publish':
                date_warning = 'MISSING_DATE_FOR_PUBLISHED_ITEM'
                date_reviews.append({
                    'source_number': num,
                    'raw_date': 'EMPTY',
                    'month_group': current_month_str,
                    'proposed_date': None,
                    'warning': date_warning
                })
        else:
            try:
                serial = float(publish_date_raw)
                base = datetime(1899, 12, 30)
                dt = base + timedelta(days=serial)
                parsed_iso_date = dt.strftime('%Y-%m-%d')
                if expected_month and dt.month != expected_month:
                    if dt.day <= 12 and dt.day == expected_month:
                        swapped = datetime(dt.year, dt.day, dt.month).strftime('%Y-%m-%d')
                        date_warning = f'DAY_MONTH_SWAP_SUSPECTED (excel={parsed_iso_date}, swapped_matches_{current_month_str}={swapped})'
                    else:
                        date_warning = f'MONTH_MISMATCH (date_month={dt.month} vs visual_month={current_month_str})'
            except ValueError:
                parts = publish_date_raw.split('/')
                if len(parts) == 3:
                    day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                    parsed_iso_date = f"{year:04d}-{month:02d}-{day:02d}"
                    if expected_month and month != expected_month:
                        if day <= 12 and day == expected_month:
                            swapped = f"{year:04d}-{day:02d}-{month:02d}"
                            date_warning = f'DAY_MONTH_SWAP_SUSPECTED (string={parsed_iso_date}, swapped={swapped})'
                        else:
                            date_warning = f'MONTH_MISMATCH (date_month={month} vs visual_month={current_month_str})'
                else:
                    date_warning = f'UNKNOWN_FORMAT ({publish_date_raw})'
                    
            date_reviews.append({
                'source_number': num,
                'raw_date': publish_date_raw,
                'month_group': current_month_str,
                'proposed_date': parsed_iso_date,
                'warning': date_warning
            })
            
        auto_candidates.append({
            'source_number': num,
            'title': topic or hook,
            'objective': objective or None,
            'platforms': platforms,
            'format': fmt,
            'goal': None,
            'hook': hook or None,
            'production_detail': detail or None,
            'cta': cta or None,
            'review_status': rev_status,
            'source_content_status': content_status or None,
            'status': wf_status,
            'progress': progress,
            'publish_at': f"{parsed_iso_date}T00:00:00.000Z" if parsed_iso_date else None,
            'publish_time_known': False,
            'notes': note or None,
            'links': row_links
        })
        
    # Read sheet2 for reference accounts
    sheet2 = ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
    s2_rows = sheet2.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
    ref_accounts = []
    for r in s2_rows[1:]:
        cells = {}
        for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c') :
            ref = c.attrib.get('r')
            col = ''.join(filter(str.isalpha, ref))
            t = c.attrib.get('t')
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit():
                val = shared_strings[int(val)]
            cells[col] = val.strip()
        acc = cells.get('A', '')
        link = cells.get('B', '')
        if acc or link:
            ref_accounts.append({
                'platform': 'tiktok',
                'account_label': acc or None,
                'url': link
            })
            
    return {
        'auto_candidates': auto_candidates,
        'incomplete_rows': incomplete_rows,
        'placeholder_rows': placeholder_rows,
        'date_reviews': date_reviews,
        'all_links': all_links,
        'reference_accounts': ref_accounts
    }

def parse_notion_csv(csv_path, candidate_source_numbers=None):
    with open(csv_path, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    linked_tasks = []
    standalone_tasks = []
    skipped_blank_tasks = []
    
    status_map = {
        'not started': 'not_started',
        'in progress': 'in_progress',
        'done': 'done',
    }
    
    priority_map = {
        'low': 'low',
        'medium': 'medium',
        'high': 'high',
    }
    
    type_map = {
        'video': 'video',
        'photo': 'photo',
        'post': 'post',
        'other': 'other',
    }

    known_numbers = set(candidate_source_numbers) if candidate_source_numbers else set(range(1, 159))

    for i, r in enumerate(rows, 1):
        title = r.get('Gypstore', '').strip()
        status_raw = r.get('Status', '').strip().lower()
        due_raw = r.get('Due date', '').strip()
        priority_raw = r.get('Priority', '').strip().lower()
        task_type_raw = r.get('Task type', '').strip().lower()
        desc = r.get('Description', '').strip()
        
        if not title:
            skipped_blank_tasks.append({
                'row_index': i,
                'status': status_raw
            })
            continue
            
        status = status_map.get(status_raw, 'not_started')
        priority = priority_map.get(priority_raw, 'medium')
        task_type = type_map.get(task_type_raw, 'other')
        
        due_date = None
        if due_raw:
            try:
                dt = datetime.strptime(due_raw, '%d %B %Y')
                due_date = dt.strftime('%Y-%m-%d')
            except ValueError:
                due_date = due_raw
                
        # Generate stable source-derived key
        slug = re.sub(r'[^a-zA-Z0-9]+', '-', title).strip('-').lower()
        h = hashlib.sha256(f"{title}|{due_date or ''}|{task_type}".encode('utf-8')).hexdigest()[:12]
        import_key = f"notion-{slug[:25]}-{h}"

        task_data = {
            'import_key': import_key,
            'title': title,
            'status': status,
            'priority': priority,
            'task_type': task_type,
            'due_date': due_date,
            'description': desc or None
        }
        
        # Link only when exactly one candidate source number matches
        numbers_in_title = [int(n) for n in re.findall(r'\b\d+\b', title)]
        valid_candidates = [n for n in numbers_in_title if n in known_numbers]

        if len(valid_candidates) == 1:
            task_data['source_number'] = valid_candidates[0]
            linked_tasks.append(task_data)
        else:
            task_data['source_number'] = None
            standalone_tasks.append(task_data)
            
    return {
        'linked_tasks': linked_tasks,
        'standalone_tasks': standalone_tasks,
        'skipped_blank_tasks': skipped_blank_tasks
    }

if __name__ == '__main__':
    excel_path = sys.argv[1]
    csv_path = sys.argv[2]
    ex_res = parse_excel(excel_path)
    cand_nums = [c['source_number'] for c in ex_res['auto_candidates']]
    csv_res = parse_notion_csv(csv_path, cand_nums)
    
    summary = {
        'auto_candidates_count': len(ex_res['auto_candidates']),
        'incomplete_rows_count': len(ex_res['incomplete_rows']),
        'placeholder_rows_count': len(ex_res['placeholder_rows']),
        'all_links_count': len(ex_res['all_links']),
        'date_reviews_count': len(ex_res['date_reviews']),
        'reference_accounts_count': len(ex_res['reference_accounts']),
        'linked_tasks_count': len(csv_res['linked_tasks']),
        'standalone_tasks_count': len(csv_res['standalone_tasks']),
        'skipped_blank_tasks_count': len(csv_res['skipped_blank_tasks']),
        'data': {
            'excel': ex_res,
            'csv': csv_res
        }
    }
    
    if len(sys.argv) > 3 and sys.argv[3] == '--summary-only':
        del summary['data']
        print(json.dumps(summary, indent=2))
    else:
        print(json.dumps(summary))
