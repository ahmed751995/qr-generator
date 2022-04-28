import frappe


@frappe.whitelist()
def send_to_quality(doc, row_no, index):
    qt_exist = frappe.db.exists("Quality Control", {'product_order': doc})
    
    if not qt_exist:
        qt_control = frappe.new_doc("Quality Control")
    else:
        qt_control = frappe.get_doc("Quality Control", {'product_order': doc})

    item_exist = frappe.db.exists("Quality Control Details", {"row_no": row_no})
    if not item_exist:
        item = frappe.new_doc("Quality Control Details")
        item.parent = qt_control.name
    else:
        item = frappe.get_doc("Quality Control Details", {"row_no": row_no})

    product = frappe.get_doc("Product Order", doc)

    create_row(item, product, int(index) - 1)
    item.save()        
    qt_control.save()
    frappe.db.commit()



def create_row(item, product, i):
    item.row_no = product.product_details[i].row_no
    item.bullet_no = product.product_details[i].bullet_no
    item.quantity = product.product_details[i].quantity
    
