frappe.listview_settings['Product Order'] = {
    onload: function(listview) {
	listview.page.add_inner_button(__("Get Finished Products"), function(){
	    frappe.call({
		method: 'sap.api.get_products_from_sap',
		callback: function(r) {
		    if(r.message.success) {
			frappe.show_alert({
			    message:__('Sync done successfully'),
			    indicator:'green'
			}, 5);
		    } else {
			frappe.show_alert({
			    message:__('Something wrong happened'),
			    indicator:'red'
			}, 5);
		    }
		}
	    }) 
	});
    }
}
