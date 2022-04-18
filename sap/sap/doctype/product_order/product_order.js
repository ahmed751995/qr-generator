// Copyright (c) 2022, ahmed and contributors
// For license information, please see license.txt
frappe.require([
    '/assets/sap/js/qrcode.js',
    'assets/test_mqtt/js/mqtt.min.js'
]);
frappe.ui.form.on('Product Order', {
    
    generate: function(frm) {
	const items = parseInt(frm.doc.rolls_no);
	for(let i = 0; i < items; i++) {
	    frm.add_child('product_details', {
		quantity: parseFloat(frm.doc.quantity / items),
	    });
	    // frm.add_custom_button('item_section', {
	    // 	'label': i,
	    // });
	}
	refresh_field('product_details');
    },
     send_to_sap: function(frm) {
	 // frm.doc.product_details.forEach((product) => {
	 //     product.item_status = "Sent to SAP";
	 // });
	 // frm.set_df_property("product_details", "read_only", 1);
	 // refresh_field("product_details");
	 frappe.print_format.print_by_server(frm.doc)
	 
     },
    print_qr: function(frm) {
	frm.doc.src = 0;
	frm.save();
	frm.print_doc();
	console.log(frm.doc.src)
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
	//     }

    },

    print_code: function(frm) {
	let tag = document.createElement("div");
	let qr_data = {
	    'row_no': frm.selected_doc.row_no,
	    'document_no': frm.doc.document_no,
	    'item_no': frm.doc.item_no,
	    'custom_no': frm.doc.customer_no,
	    'customer_name': frm.doc.customer_name,
	    'quantity': frm.selected_doc.quantity,
	    'length': frm.doc.length,
	    'width': frm.doc.width,
	    'thickness': frm.doc.thickness,
	    'core_type': frm.doc.core_type,
	    'net_wieght': frm.selected_doc.net_weight,
	    'bullet_no': frm.selected_doc.bullet_no,
	    'application': frm.doc.application,
	    'roll_status': frm.selected_doc.roll_status,
	}
	frm.doc.src = frm.selected_doc.idx;
	frm.save()
	frm.print_doc();
    }
});
