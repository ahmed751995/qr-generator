import frappe
import datetime

    
@frappe.whitelist()
def get_items_wait_quality(bullet_no='', row_no='', document_no='', start_date='', end_date=''):
    """
    return a list of dicts of Product Order Details(child table) joined with Product
    Order(parent table) which there item_status = 'Waiting Quality' filtered on the 
    function input, if there wasn't any input the function return all waiting Quality
    items without filter

    bullet_no = Product Order Details bullet_no
    row_no = Product Order Details row_no
    document_no = Product Order document_no
    start_date = the creation date of Product Order Details created on or after the start_date
    end_date = the creation date of Product Order Details created on or before the end_date
    """
    
    query = """
        SELECT pd.name, pd.row_no, pd.bullet_no, pd.item_quantity, pd.growth_weight, pd.net_weight, pd.quality_status, pd.item_status, p.document_no, p.item_group, p.item_no, p.customer_no, p.customer_name, p.quantity, p.length, p.width, p.item_serial, p.weight, p.thickness, p.core_type, p.core_weight, p.total_weight, p.application 
        FROM `tabProduct Order` AS p JOIN `tabProduct Order Details` AS pd 
        ON (p.name = pd.parent) 
        WHERE (pd.item_status='Waiting Quality')
        """

    if bullet_no:
        query += f" AND pd.bullet_no='{bullet_no}'"

    if row_no:
        query += f"  AND pd.row_no='{row_no}'"

    if document_no:
        query += f" AND p.document_no='{document_no}'"

    if start_date:
        query += f" AND pd.creation>='{start_date}'"

    if end_date:
        end_date = datetime.datetime.strptime(end_date, "%Y-%m-%d")
        end_date += datetime.timedelta(days=1)
        query += f" AND pd.creation<='{end_date}'"
    
    items = frappe.db.sql(query, as_dict=1)
    return items


@frappe.whitelist()
def update_item_quality(name, status, qt_inspection):
    """
    update the status and quality inspection values of the Product Order Details

    name = Product Order Details name
    status = Product Order Details new status
    qt_inspection = Product Order Details new quality inspection value
    """
    doc = frappe.get_doc("Product Order Details", name)
    print(name)
    doc.quality_status = status
    doc.item_status = "Inspected"
    doc.qt_inspection = qt_inspection
    doc.save()
    frappe.db.commit()
    return True
