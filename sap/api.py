import datetime
import requests
import frappe
import json


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
        SELECT pd.name, pd.row_no, pd.bullet_no, pd.item_quantity, pd.growth_weight, pd.net_weight, pd.quality_status, pd.item_status, p.document_no, p.item_group, p.customer_no, p.customer_name, p.quantity, p.length, p.width, p.item_serial, p.weight, p.thickness, p.core_type, p.core_weight, p.total_weight, p.application 
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


def session_login(url = "https://htpc20847p01.cloudiax.com:50000/b1s/v1/Login"):

    payload = json.dumps({
        "CompanyDB": "A20847_AQPI_T01",
        "Password": "12345",
        "UserName": "B1i"
    })
    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    session_id = json.loads(response.text)['SessionId']
    return session_id

@frappe.whitelist()
def get_products_from_sap(url = "https://htpc20847p01.cloudiax.com:50000/b1s/v1/SQLQueries('GetFinishedProd')/List"):

    session_id = session_login()
    payload={}
    headers = {
        'Cookie': f'B1SESSION={session_id}'
    }

    response = requests.request("GET", url, headers=headers, data=payload)

    data = json.loads(response.text)["value"]

    for d in data:
        exists = frappe.db.exists("Product Order", {"document_no": d['DocNum']})
        if not exists:
            product = frappe.new_doc("Product Order")
            product.customer_name = d['CardName']
            product.customer_no = d['CardCode']
            product.item_serial = d['ItemCode']
            product.quantity = d['Quantity']
            product.item_group = d['ProdName']
            product.document_no = d['DocNum']
            product.length = d['U_B1M001']
            product.width = d['U_B1M002']
            product.thickness = d['U_B1M003']
            product.density = d['U_B1M004']
            product.cover_type = d['U_B1M005']
            product.core_type = d['U_B1M006']
            product.core_weight = d['U_B1M007']
            product.extensions = d['U_B1M008']
            product.weight = d['U_B1M009']
            product.total_weight = d['U_B1M010']
            product.color = d['U_B1M011']
            product.rolls_no = d['U_B1M012']
            product.hand = d['U_B1M013']
            product.printing_color = d['U_B1M014']
            product.folding = d['U_B1M015']
            product.welding = d['U_B1M016']
            product.welding_type = d['U_B1M017']
            product.guarantee = d['U_B1M018']
            product.handling_type = d['U_B1M019']
            product.handling_direction =d['U_B1M020']
            product.application = d['U_B1M021']
            # product.roll_status = d['U_B1M022']
            product.packing = d['U_B1M023']
            product.core_width = d['U_B1M026']
            product.roll_width = d['U_B1M027']
            product.packing_weight = d['U_B1M028']

            product.insert()
    # frappe.throw("out ")
    frappe.db.commit()
    return {'success': True}
