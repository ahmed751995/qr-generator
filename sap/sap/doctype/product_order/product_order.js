// Copyright (c) 2022, ahmed and contributors
// For license information, please see license.txt
frappe.require([
    'assets/test_mqtt/js/mqtt.min.js'
]);
frappe.ui.form.on('Product Order', {
    
    generate: function(frm) {
	const items = parseInt(frm.doc.rolls_no);
	for(let i = 0; i < items; i++) {
	    frm.add_child('product_details', {
		quantity: parseFloat(frm.doc.quantity / items),
	    });
	}
	refresh_field('product_details');
    },
     send_to_sap: function(frm) {
	 frm.doc.product_details.forEach((product) => {
	     product.item_status = "Sent to SAP";
	 });
	 Object.keys(frm.doc).forEach(doc => {
	     frm.set_df_property(doc, "read_only", 1);
	 });
	 refresh_field("product_details");
	 frm.save();
     },
    print_qr: function(frm) {
	frappe.call({
	    method: 'sap.api.print_qr_list',
	    args: {
		doc: frm.doc.name
	    },
	    callback: function(r) {
		PrintElem(r.message)
	    }
	})
    }
    
});

frappe.ui.form.on('Product Order Details', {
    measure: function(frm) {
	const options = {
            clean: true, // retain session
	    connectTimeout: 3000, // Timeout period increased to 30 seconds
	    // Authentication information
	    // clientId: 'foobar_test_random' + Math.floor(Math.random() * 10000),
	}
	const connectUrl = 'wss://test.mosquitto.org:8081'
	const client = mqtt.connect(connectUrl,options)

	//actually subscribe to something on a sucessfull connection
	client.on('connect', (connack) => {
	    if(frm.selected_doc.scaler)
		client.subscribe(frm.selected_doc.scaler);
	})

	client.on('reconnect', (error) => {
	    console.log('reconnecting:', error)
	})

	client.on('error', (error) => {
	    console.log('Connection failed:', error)
	})

	client.on('message', (topic, message) => {
	    frm.selected_doc.net_weight =  message.toString()
	    refresh_field('product_details')
	    client.unsubscribe(frm.selected_doc.scaler)
	})
    },

    print_code: function(frm) {
	let qr_data = {...frm.doc,
		       'item_quantity': frm.selected_doc.quantity,
		       'item_row_no': frm.selected_doc.row_no,
		       'item_net_weight': frm.selected_doc.net_weight,
		       'item_bullet_no': frm.selected_doc.bullet_no,
		       'item_roll_status': frm.selected_doc.roll_status
		      }
	frm.save()
	frappe.call({
	    method: 'sap.api.print_qr',
	    args: {
		doc: qr_data
	    },
	    callback: function(r) {
		PrintElem(r.message)
	    }
	})
    }
});

function PrintElem(elem)
{
    var mywindow = window.open('', 'PRINT');
    mywindow.document.write(elem);
    mywindow.document.close(); // necessary for IE >= 10
    mywindow.focus(); // necessary for IE >= 10*/

    mywindow.print();
    mywindow.close();

    return true;
}
