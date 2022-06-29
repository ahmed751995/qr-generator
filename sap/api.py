import datetime
import requests
import frappe
import json
import time


@frappe.whitelist()
def get_items_wait_quality(pallet_no='', start_date='', end_date='', item_serial='', document_no=''):
    """
    return a list of dicts of Product Order Details(child table) joined with Product
    Order(parent table) which there item_status = 'Waiting Quality' filtered on the 
    function input, if there wasn't any input the function return all waiting Quality
    items without filter

    pallet_no = Product Order Details pallet_no
    document_no = Product Order document_no
    start_date = the creation date of Product Order Details created on or after the start_date
    end_date = the creation date of Product Order Details created on or before the end_date
    """

    query = """
        SELECT pd.name, pd.pallet_no, pd.item_quantity, pd.gross_weight, pd.net_weight, pd.quality_status, pd.item_status, p.document_no, p.item_group, p.customer_no, p.customer_name, p.quantity, p.length, p.width, p.item_serial, p.weight, p.thickness, p.core_type, p.core_weight, p.total_weight, p.application 
        FROM `tabProduct Order` AS p JOIN `tabProduct Order Details` AS pd 
        ON (p.name = pd.parent) 
        WHERE (pd.item_status='Waiting Quality')
        """

    if item_serial:
        query += f" AND p.item_serial='{item_serial}'"
    if pallet_no:
        query += f" AND pd.pallet_no='{pallet_no}'"

    if start_date:
        query += f" AND pd.creation>='{start_date}'"

    if end_date:
        end_date = datetime.datetime.strptime(end_date, "%Y-%m-%d")
        end_date += datetime.timedelta(days=1)
        query += f" AND pd.creation<='{end_date}'"

    if document_no:
        query += f" AND p.document_no='{document_no}'"

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


def session_login(url, company_db, username, password):

    payload = json.dumps({
        "CompanyDB": company_db,
        "Password": password,
        "UserName": username
    })
    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    session_id = json.loads(response.text)['SessionId']
    return session_id


@frappe.whitelist()
def get_products_from_sap(progress=False):

    product_setting = frappe.get_doc("Product Setting")
    login_url = product_setting.login_url
    password = product_setting.password
    username = product_setting.user_name
    company_db = product_setting.company_db

    session_id = session_login(login_url, company_db, username, password)

    payload = {}
    headers = {
        'Cookie': f'B1SESSION={session_id}'
    }

    response = requests.request(
        "GET", product_setting.product_url, headers=headers, data=payload)
    try:
        sap_products = json.loads(response.text)["value"]
    except KeyError:
        frappe.throw("No values Provided check your URL")

    for i in range(len(sap_products)):
        exists = frappe.db.exists("Product Order", {
                                  "document_no": sap_products[i]['DocEntry'], "code": sap_products[i]['Code']})
        if not exists:
            product = frappe.new_doc('Product Order')
            ignored = {"name", "owner", "creation", "modified", "modified_by", "parent", "parentfield", "parenttype", "idx",
                       "docstatus", "company_db", "user_name", "password", "default_scaler", "doctype", "login_url", "product_url"}
            for value in product_setting.as_dict():
                if value not in ignored:
                    setattr(product, value, sap_products[i].get(
                        product_setting.get(value)))
            product.insert()

    try:
        frappe.db.commit()
        return {'success': True}
    except:
        return {'success': False}


@frappe.whitelist()
def send_product_to_sap(product_name, items=None):
    post_product_setting = frappe.get_doc("Post Product Setting").as_dict()

    login_url = post_product_setting["login_url"]
    password = post_product_setting["password"]
    username = post_product_setting["user_name"]
    company_db = post_product_setting["company_db"]
    url = post_product_setting["product_url"]

    session_id = session_login(login_url, company_db, username, password)

    ignored = {"name", "owner", "creation", "modified", "modified_by", "parent", "parentfield", "parenttype", "idx",
               "docstatus", "company_db", "user_name", "password", "default_scaler", "doctype", "login_url", "product_url"}

    product = frappe.db.get('Product Order', product_name)
    data = {
        "DocType": "dDocument_Items",
        "DocDate": str(product.creation.date()),
        "DocumentLines": [
            {
                "BaseType": 202,
                "BaseEntry": product.document_no
            }
        ]
    }
    batch_number = []
    total_quantity = 0
    if items:
        items_list = [frappe.db.get("Product Order Details", item)
                      for item in json.loads(items)]
    else:
        items = frappe.db.get_list("Product Order Details", filters={'item_status': [
                                   '!=', 'Sent to SAP'], 'parent': product.name})
        if not items:
            return {"success": True}

        items_list = [frappe.db.get("Product Order Details", item)
                      for item in items]

    for item in items_list:
        batch = {}
        batch["BatchNumber"] = str(product.document_no) + "/" + str(item.idx)
        batch["AddmisionDate"] = str(item.get("creation").date())

        if product.get("weight_type") == "وزن صافى":
            try:
                batch["Quantity"] = item["net_weight"]
                total_quantity += float(item["net_weight"])
            except:
                return {"success": False,
                        "message": "make sure you set all items Net Weight"}
        else:
            try:
                batch["Quantity"] = item["gross_weight"]
                total_quantity += float(item["gross_weight"])
            except:
                return {"success": False,
                        "message": "make sure you set all items Gross Weight"}

        batch["InternalSerialNumber"] = product.get("sorder")
        batch["ManufacturerSerialNumber"] = product.customer_name
        batch["Location"] = str(product.document_no) + \
            '/' + str(item.get("pallet_no", ''))

        for value in post_product_setting:
            if value not in ignored:
                batch[post_product_setting[value]] = product.get(value, '')

        batch[post_product_setting["net_weight"]
              ] = item.get("net_weight", '')
        batch[post_product_setting["gross_weight"]
              ] = item.get("gross_weight", '')

        batch_number.append(batch)

    data["DocumentLines"][0]["BatchNumbers"] = batch_number
    data["DocumentLines"][0]["Quantity"] = total_quantity

    headers = {
        'Cookie': f'B1SESSION={session_id}'
    }
    payload = json.dumps(data)
    response = requests.request("POST", url, headers=headers, data=payload)
    resp = json.loads(response.text)
    print(resp)
    # print(resp['error'])
    if response.status_code == 201:
        return {"success": True}
    else:
        return {"success": False, "message": resp['error']['message']["value"]}
