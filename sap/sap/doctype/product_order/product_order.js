// Copyright (c) 2022, ahmed and contributors
// For license information, please see license.txt
frappe.require([
    '/assets/sap/js/qrcode.js'
]);
frappe.ui.form.on('Product Order', {
    generate: function(frm) {
	const items = parseInt(frm.doc.roll_number);
	console.log(frm)
	for(let i = 0; i < items; i++) {
	    frm.add_child('product_details', {
		serial_no: frm.doc.item_serial,
	    });
	    frm.add_custom_button('item_section', {
		'label': i,
	    });
	}
	refresh_field('product_details');
    },
    before_save: function(frm) {
	frm.doc.src = "";
	frm.doc.selected_doc = "";
    }
    
});

frappe.ui.form.on('Product Order Details', {
    measure: function(frm) {

	// frappe.call({
	//     url: "https://www.7timer.info/bin/astro.php?lon=113.2&lat=23.1&ac=0&unit=metric&output=json&tzshift=0",
	//     type: "GET",
	//     callback: function(r) {
	// 	console.log(r)
	//     }
	// });
	fetch("http://127.0.0.1:5000/measure")
	    .then(response =>response.json())
	    .then(data => {
		frm.selected_doc.weight = data.value;
		refresh_field("product_details");
	    });
	
	// frm.selected_doc.weight = frm.selected_doc.serial_no

    },

    print_code: function(frm) {
	let tag = document.createElement("div");
	let values = JSON.stringify({"data": frm.selected_doc});
	console.log(values);
	new QRCode(tag, values);
	const x = setTimeout(generate, 200);

	function generate() {
	    frm.doc.src = tag.lastChild.src;
	    frm.doc.selected_doc = parseInt(frm.selected_doc.idx) - 1
	    console.log(frm.doc.product_details[frm.doc.selected_doc]);
	    frm.print_doc();
	}
	

    }
    
});
