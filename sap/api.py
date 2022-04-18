import frappe
import json

@frappe.whitelist()
def print_qr(doc):
    d = frappe.get_doc('Product Order', doc)
    t = frappe.render_template('sap/print_format/qr/qr.html', {'doc':d})
    return t


@frappe.whitelist()
def print_qr_list(doc):
    d = frappe.get_doc('Product Order', doc)
    t = frappe.utils.jinja.render_template('sap/print_format/qr_list/qr_list.html', {'doc':d})
    return t
