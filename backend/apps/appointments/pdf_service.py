import os
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
	Image,
	Paragraph,
	SimpleDocTemplate,
	Spacer,
	Table,
	TableStyle,
)


def safe_value(value, fallback='N/A'):
	if value is None or value == '':
		return fallback

	return str(value)


def format_money(value):
	if value is None or value == '':
		return 'N/A'

	try:
		return f'{float(value):,.0f} VND'
	except (TypeError, ValueError):
		return safe_value(value)


def register_vietnamese_font():
	regular_font_path = settings.BASE_DIR / 'static' / 'fonts' / 'DejaVuSans.ttf'
	bold_font_path = settings.BASE_DIR / 'static' / 'fonts' / 'DejaVuSans-Bold.ttf'

	if not os.path.exists(regular_font_path):
		raise FileNotFoundError(
			f'Vietnamese PDF font not found: {regular_font_path}'
		)

	if 'DejaVuSans' not in pdfmetrics.getRegisteredFontNames():
		pdfmetrics.registerFont(
			TTFont('DejaVuSans', str(regular_font_path))
		)

	if os.path.exists(bold_font_path):
		if 'DejaVuSans-Bold' not in pdfmetrics.getRegisteredFontNames():
			pdfmetrics.registerFont(
				TTFont('DejaVuSans-Bold', str(bold_font_path))
			)

	return {
		'regular': 'DejaVuSans',
		'bold': (
			'DejaVuSans-Bold'
			if 'DejaVuSans-Bold' in pdfmetrics.getRegisteredFontNames()
			else 'DejaVuSans'
		),
	}


def build_styles(regular_font, bold_font):
	styles = getSampleStyleSheet()

	styles['Title'].fontName = bold_font
	styles['Heading1'].fontName = bold_font
	styles['Heading2'].fontName = bold_font
	styles['Heading3'].fontName = bold_font
	styles['BodyText'].fontName = regular_font
	styles['Normal'].fontName = regular_font

	styles.add(ParagraphStyle(
		name='TableLabel',
		parent=styles['Normal'],
		fontName=bold_font,
		fontSize=8.6,
		leading=11,
		textColor=colors.HexColor('#0f172a'),
	))

	styles.add(ParagraphStyle(
		name='TableValue',
		parent=styles['Normal'],
		fontName=regular_font,
		fontSize=8.9,
		leading=11.5,
		textColor=colors.HexColor('#0f172a'),
	))

	styles.add(ParagraphStyle(
		name='HospitalName',
		parent=styles['Normal'],
		fontName=bold_font,
		fontSize=15,
		leading=19,
		textColor=colors.HexColor('#0f172a'),
	))

	styles.add(ParagraphStyle(
		name='HospitalInfo',
		parent=styles['Normal'],
		fontName=regular_font,
		fontSize=8.5,
		leading=12,
		textColor=colors.HexColor('#475569'),
	))

	styles.add(ParagraphStyle(
		name='DocumentTitle',
		parent=styles['Title'],
		fontName=bold_font,
		fontSize=17,
		leading=22,
		alignment=TA_CENTER,
		textColor=colors.HexColor('#0f766e'),
		spaceAfter=4,
	))

	styles.add(ParagraphStyle(
		name='DocumentSubtitle',
		parent=styles['Normal'],
		fontName=regular_font,
		fontSize=9,
		leading=12,
		alignment=TA_CENTER,
		textColor=colors.HexColor('#64748b'),
	))

	styles.add(ParagraphStyle(
		name='SectionTitle',
		parent=styles['Heading2'],
		fontName=bold_font,
		fontSize=11.5,
		leading=15,
		textColor=colors.HexColor('#0f172a'),
		spaceBefore=6,
		spaceAfter=7,
	))

	styles.add(ParagraphStyle(
		name='SmallText',
		parent=styles['Normal'],
		fontName=regular_font,
		fontSize=8,
		leading=11,
		textColor=colors.HexColor('#475569'),
	))

	styles.add(ParagraphStyle(
		name='Notice',
		parent=styles['Normal'],
		fontName=regular_font,
		fontSize=8.7,
		leading=12,
		textColor=colors.HexColor('#7c2d12'),
		backColor=colors.HexColor('#fff7ed'),
		borderColor=colors.HexColor('#fed7aa'),
		borderWidth=0.5,
		borderPadding=7,
	))

	styles.add(ParagraphStyle(
		name='SignatureName',
		parent=styles['Normal'],
		fontName=bold_font,
		fontSize=10,
		leading=13,
		alignment=TA_RIGHT,
		textColor=colors.HexColor('#0f172a'),
	))

	styles.add(ParagraphStyle(
		name='Footer',
		parent=styles['Normal'],
		fontName=regular_font,
		fontSize=7.5,
		leading=10,
		alignment=TA_CENTER,
		textColor=colors.HexColor('#64748b'),
	))

	return styles


def cell(value, style):
	return Paragraph(safe_value(value), style)


def make_label_value_rows(rows, styles):
	return [
		[
			cell(label, styles['TableLabel']),
			cell(value, styles['TableValue']),
		]
		for label, value in rows
	]


def base_table_style(regular_font):
	return [
		('FONTNAME', (0, 0), (-1, -1), regular_font),
		('GRID', (0, 0), (-1, -1), 0.45, colors.HexColor('#cbd5e1')),
		('PADDING', (0, 0), (-1, -1), 7),
		('VALIGN', (0, 0), (-1, -1), 'TOP'),
		('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
	]


def label_table_style(regular_font, bold_font):
	return TableStyle([
		*base_table_style(regular_font),
		('FONTNAME', (0, 0), (0, -1), bold_font),
		('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
	])


def header_table_style(regular_font, bold_font):
	return TableStyle([
		*base_table_style(regular_font),
		('FONTNAME', (0, 0), (-1, 0), bold_font),
		('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ecfeff')),
		('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
		('PADDING', (0, 0), (-1, -1), 6),
	])


def get_hospital_logo():
	logo_path = getattr(settings, 'HOSPITAL_LOGO_PATH', None)

	if logo_path and os.path.exists(logo_path):
		return str(logo_path)

	return None


def create_header(styles):
	hospital_name = getattr(settings, 'HOSPITAL_NAME', 'Firefly Hospital')
	hospital_name_vi = getattr(settings, 'HOSPITAL_NAME_VI', 'Bệnh viện Firefly')
	hotline = getattr(settings, 'HOSPITAL_HOTLINE', '1900 2026')
	email = getattr(settings, 'HOSPITAL_EMAIL', 'contact@fireflyhospital.vn')
	address = getattr(
		settings,
		'HOSPITAL_ADDRESS',
		'123 Health Street, District 1, Ho Chi Minh City, Vietnam'
	)
	website = getattr(settings, 'HOSPITAL_WEBSITE', 'https://fireflyhospital.vn')

	logo_path = get_hospital_logo()

	if logo_path:
		logo = Image(logo_path, width=22 * mm, height=22 * mm)
	else:
		logo = Paragraph('FF', styles['HospitalName'])

	hospital_info = [
		Paragraph(hospital_name, styles['HospitalName']),
		Paragraph(hospital_name_vi, styles['HospitalInfo']),
		Paragraph(f'Hotline: {hotline} | Email: {email}', styles['HospitalInfo']),
		Paragraph(f'Address: {address}', styles['HospitalInfo']),
		Paragraph(f'Website: {website}', styles['HospitalInfo']),
	]

	header_table = Table(
		[[logo, hospital_info]],
		colWidths=[28 * mm, 145 * mm],
	)

	header_table.setStyle(TableStyle([
		('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
		('BOTTOMPADDING', (0, 0), (-1, -1), 10),
		('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#0f766e')),
	]))

	return header_table


def create_footer(canvas, doc, regular_font):
	canvas.saveState()

	width, _ = A4

	hotline = getattr(settings, 'HOSPITAL_HOTLINE', '1900 2026')
	email = getattr(settings, 'HOSPITAL_EMAIL', 'contact@fireflyhospital.vn')
	address = getattr(
		settings,
		'HOSPITAL_ADDRESS',
		'123 Health Street, District 1, Ho Chi Minh City, Vietnam'
	)
	website = getattr(settings, 'HOSPITAL_WEBSITE', 'https://fireflyhospital.vn')

	footer_text = (
		f'Firefly Hospital | Hotline: {hotline} | Email: {email} | '
		f'Website: {website}'
	)
	address_text = f'Address: {address}'

	canvas.setFont(regular_font, 7.5)
	canvas.setFillColor(colors.HexColor('#64748b'))
	canvas.drawCentredString(width / 2, 16 * mm, footer_text)
	canvas.drawCentredString(width / 2, 11 * mm, address_text)
	canvas.drawRightString(width - 18 * mm, 7 * mm, f'Page {doc.page}')

	canvas.restoreState()


def doctor_full_name(appointment):
	user = appointment.doctor.user

	return (
		getattr(user, 'full_name', None)
		or getattr(user, 'email', None)
		or str(user)
	)


def patient_full_name(appointment):
	user = appointment.patient

	return (
		getattr(user, 'full_name', None)
		or getattr(user, 'email', None)
		or str(user)
	)


def get_doctor_signature_image(appointment):
	signature = getattr(appointment.doctor, 'signature_image', None)

	if signature and hasattr(signature, 'path') and os.path.exists(signature.path):
		return signature.path

	return None


def generate_medical_pdf(appointment):
	buffer = BytesIO()

	fonts = register_vietnamese_font()
	regular_font = fonts['regular']
	bold_font = fonts['bold']
	styles = build_styles(regular_font, bold_font)

	doc = SimpleDocTemplate(
		buffer,
		pagesize=A4,
		rightMargin=18 * mm,
		leftMargin=18 * mm,
		topMargin=16 * mm,
		bottomMargin=26 * mm,
	)

	elements = []

	elements.append(create_header(styles))
	elements.append(Spacer(1, 10))

	elements.append(
		Paragraph('MEDICAL RECORD & PRESCRIPTION', styles['DocumentTitle'])
	)
	elements.append(
		Paragraph('HỒ SƠ KHÁM BỆNH & ĐƠN THUỐC', styles['DocumentSubtitle'])
	)
	elements.append(Spacer(1, 10))

	elements.append(
		Paragraph('1. Patient Information / Thông tin bệnh nhân', styles['SectionTitle'])
	)

	patient_rows = make_label_value_rows([
		['Patient / Bệnh nhân', patient_full_name(appointment)],
		['Appointment ID / Mã lịch hẹn', appointment.appointment_id],
		['Visit type / Hình thức khám', appointment.visit_type],
		['Date / Ngày khám', appointment.appointment_date],
		[
			'Time / Thời gian',
			f'{safe_value(appointment.start_time)} - {safe_value(appointment.end_time)}'
		],
		['Address / Địa chỉ', getattr(appointment, 'address', '')],
		['Status / Trạng thái', appointment.status],
	], styles)

	patient_table = Table(
		patient_rows,
		colWidths=[60 * mm, 113 * mm],
	)
	patient_table.setStyle(label_table_style(regular_font, bold_font))
	elements.append(patient_table)

	elements.append(Spacer(1, 8))
	elements.append(
		Paragraph('2. Doctor Information / Thông tin bác sĩ', styles['SectionTitle'])
	)

	doctor_rows = make_label_value_rows([
		['Doctor / Bác sĩ', f'Dr. {safe_value(doctor_full_name(appointment))}'],
		['Specialty / Chuyên khoa', getattr(appointment.doctor, 'specialty', '')],
		[
			'Experience / Kinh nghiệm',
			f'{safe_value(getattr(appointment.doctor, "experience_years", ""))} years'
		],
		['Consultation fee / Phí khám', format_money(getattr(appointment, 'total_fee', None))],
	], styles)

	doctor_table = Table(
		doctor_rows,
		colWidths=[60 * mm, 113 * mm],
	)
	doctor_table.setStyle(label_table_style(regular_font, bold_font))
	elements.append(doctor_table)

	if hasattr(appointment, 'vitals'):
		vitals = appointment.vitals

		elements.append(Spacer(1, 8))
		elements.append(
			Paragraph('3. Clinical Information / Thông tin khám bệnh', styles['SectionTitle'])
		)

		vitals_rows = make_label_value_rows([
			[
				'Blood pressure / Huyết áp',
				f'{safe_value(vitals.blood_pressure_systolic)} / '
				f'{safe_value(vitals.blood_pressure_diastolic)}'
			],
			['Heart rate / Nhịp tim', vitals.heart_rate],
			['Temperature / Nhiệt độ', vitals.temperature],
			['Weight / Cân nặng', vitals.weight],
			['Height / Chiều cao', vitals.height],
			['SpO2', vitals.spo2],
		], styles)

		vitals_table = Table(
			vitals_rows,
			colWidths=[60 * mm, 113 * mm],
		)
		vitals_table.setStyle(label_table_style(regular_font, bold_font))
		elements.append(vitals_table)

		elements.append(Spacer(1, 6))
		elements.append(
			Paragraph(
				f'<b>Diagnosis / Chẩn đoán:</b> '
				f'{safe_value(vitals.diagnosis, "No diagnosis recorded.")}',
				styles['BodyText']
			)
		)

	elements.append(Spacer(1, 8))
	elements.append(
		Paragraph('4. Symptoms / Triệu chứng', styles['SectionTitle'])
	)

	symptoms = appointment.symptoms.select_related('symptom').all()

	if symptoms.exists():
		for item in symptoms:
			elements.append(
				Paragraph(
					f'- {safe_value(item.symptom_name)} | '
					f'Severity / Mức độ: {safe_value(item.severity_score)} | '
					f'Duration / Thời gian: {safe_value(item.duration_hours)} hours',
					styles['BodyText']
				)
			)
	else:
		elements.append(
			Paragraph('No symptoms recorded. / Không ghi nhận triệu chứng.', styles['BodyText'])
		)

	elements.append(Spacer(1, 8))
	elements.append(
		Paragraph('5. Comorbidities / Bệnh nền', styles['SectionTitle'])
	)

	comorbidities = appointment.comorbidities.select_related('comorbidity').all()

	if comorbidities.exists():
		for item in comorbidities:
			elements.append(
				Paragraph(
					f'- {safe_value(item.comorbidity_name)}',
					styles['BodyText']
				)
			)
	else:
		elements.append(
			Paragraph('No comorbidities recorded. / Không ghi nhận bệnh nền.', styles['BodyText'])
		)

	elements.append(Spacer(1, 8))
	elements.append(
		Paragraph('6. Prescription / Đơn thuốc', styles['SectionTitle'])
	)

	if hasattr(appointment, 'prescription'):
		prescription = appointment.prescription

		if prescription.diagnosis:
			elements.append(
				Paragraph(
					f'<b>Prescription diagnosis / Chẩn đoán đơn thuốc:</b> '
					f'{safe_value(prescription.diagnosis)}',
					styles['BodyText']
				)
			)
			elements.append(Spacer(1, 6))

		items = prescription.items.all()

		if items.exists():
			prescription_rows = [
				[
					cell('Medicine<br/>Thuốc', styles['TableLabel']),
					cell('Dosage<br/>Liều dùng', styles['TableLabel']),
					cell('Frequency<br/>Tần suất', styles['TableLabel']),
					cell('Duration<br/>Thời gian', styles['TableLabel']),
					cell('Qty<br/>SL', styles['TableLabel']),
					cell('Instructions<br/>Hướng dẫn', styles['TableLabel']),
				]
			]

			for item in items:
				prescription_rows.append([
					cell(item.medicine_name, styles['TableValue']),
					cell(item.dosage, styles['TableValue']),
					cell(item.frequency, styles['TableValue']),
					cell(item.duration, styles['TableValue']),
					cell(item.quantity, styles['TableValue']),
					cell(item.instructions or '', styles['TableValue']),
				])

			prescription_table = Table(
				prescription_rows,
				repeatRows=1,
				colWidths=[
					37 * mm,
					25 * mm,
					30 * mm,
					25 * mm,
					13 * mm,
					43 * mm,
				]
			)

			prescription_table.setStyle(header_table_style(regular_font, bold_font))
			elements.append(prescription_table)
		else:
			elements.append(
				Paragraph(
					'No prescription items recorded. / Không có thuốc trong đơn.',
					styles['BodyText']
				)
			)
	else:
		elements.append(
			Paragraph(
				'No prescription recorded. / Chưa có đơn thuốc.',
				styles['BodyText']
			)
		)

	elements.append(Spacer(1, 10))

	elements.append(
		Paragraph(
			'<b>Prescription-only medicine notice / Lưu ý thuốc kê đơn:</b><br/>'
			'This prescription may be used to purchase prescription-only medicines '
			'according to the doctor’s instructions. Please present this document '
			'at the pharmacy. Do not change dosage or stop medication without medical advice.'
			'<br/>'
			'Đơn thuốc này được sử dụng để mua các thuốc kê đơn theo chỉ định của bác sĩ. '
			'Vui lòng xuất trình tài liệu này tại nhà thuốc. Không tự ý thay đổi liều dùng '
			'hoặc ngừng thuốc khi chưa có hướng dẫn của nhân viên y tế.',
			styles['Notice']
		)
	)

	elements.append(Spacer(1, 10))
	elements.append(
		Paragraph('7. Payment Summary / Thông tin thanh toán', styles['SectionTitle'])
	)

	payment_rows = make_label_value_rows([
		['Deposit paid / Đã đặt cọc', format_money(appointment.deposit_amount)],
		['Final payment / Thanh toán còn lại', format_money(appointment.final_amount)],
		['Final paid / Đã thanh toán đủ', 'Yes / Có' if appointment.final_paid else 'No / Không'],
		['Total fee / Tổng phí', format_money(appointment.total_fee)],
	], styles)

	payment_table = Table(
		payment_rows,
		colWidths=[60 * mm, 113 * mm],
	)
	payment_table.setStyle(label_table_style(regular_font, bold_font))
	elements.append(payment_table)

	elements.append(Spacer(1, 16))

	signature_path = get_doctor_signature_image(appointment)

	signature_content = []

	if signature_path:
		signature_content.append(
			Image(signature_path, width=45 * mm, height=20 * mm)
		)
	else:
		signature_content.append(
			Paragraph(
				'[No signature image uploaded]',
				styles['SmallText']
			)
		)

	signature_content.append(
		Paragraph(
			f'Dr. {safe_value(doctor_full_name(appointment))}',
			styles['SignatureName']
		)
	)

	signature_table = Table([
		[
			'',
			signature_content,
		]
	], colWidths=[95 * mm, 78 * mm])

	signature_table.setStyle(TableStyle([
		('VALIGN', (0, 0), (-1, -1), 'TOP'),
		('ALIGN', (1, 0), (1, 0), 'RIGHT'),
	]))

	elements.append(signature_table)

	doc.build(
		elements,
		onFirstPage=lambda canvas, doc_obj: create_footer(canvas, doc_obj, regular_font),
		onLaterPages=lambda canvas, doc_obj: create_footer(canvas, doc_obj, regular_font),
	)

	pdf_content = buffer.getvalue()
	buffer.close()

	filename = f'medical_record_{appointment.appointment_id}.pdf'

	appointment.medical_pdf.save(
		filename,
		ContentFile(pdf_content),
		save=False
	)

	appointment.save(update_fields=['medical_pdf', 'updated_at'])

	return appointment.medical_pdf