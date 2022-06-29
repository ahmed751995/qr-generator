# Copyright (c) 2022, ahmed and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from sap.qr_generator import get_qr
from sap.api import send_product_to_sap


class ProductOrder(Document):
    def before_save(self):
        self.selected_product = []
        for item in self.product_details:
            data = {
                'customer_no': self.customer_no,
                'customer_name': self.customer_name,
                'item_no': self.item_serial,
                'product_no': self.item_no,
                'item_type': self.item_type
            }

            item.qr_code = get_qr(data)

    def before_submit(self):
        resp = send_product_to_sap(self.name)
        if not resp["success"]:
            frappe.throw(resp["message"])
        else:
            for item in self.product_details:
                item.item_status = "Sent to SAP"
