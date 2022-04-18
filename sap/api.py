import frappe
from PyPDF2 import PdfFileWriter

@frappe.whitelist()
def direct_print(doctype):
    output = PdfFileWriter()
    frappe.get_print(doctype, name=None, print_format=None, doc=None, no_letterhead=None, as_pdf = True, output = output)
