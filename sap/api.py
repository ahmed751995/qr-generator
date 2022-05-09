import frappe


    
@frappe.whitelist()
def get_items_wait_quality():
    items = frappe.db.sql(
        """
        SELECT pd.name, pd.row_no, pd.bullet_no, pd.item_quantity, pd.growth_weight, pd.net_weight, pd.quality_status, pd.item_status, p.document_no, p.item_group, p.item_no, p.customer_no, p.customer_name, p.quantity, p.length, p.width, p.item_serial, p.weight, p.thickness, p.core_type, p.core_weight, p.total_weight, p.application FROM `tabProduct Order` AS p JOIN `tabProduct Order Details` AS pd ON (p.name = pd.parent) WHERE pd.item_status='Waiting Quality'
        """,as_dict=1)
    return items


@frappe.whitelist()
def update_item_quality(name, status, qt_inspection):
    
    doc = frappe.get_doc("Product Order Details", name)
    print(name)
    doc.quality_status = status
    doc.item_status = "Inspected"
    doc.qt_inspection = qt_inspection
    doc.save()
    frappe.db.commit()
    return True
