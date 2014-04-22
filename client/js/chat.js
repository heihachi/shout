$(function() {
	var chat = $("#chat");
	var sidebar = $("#sidebar");
	
	var commands = [
		"/connect",
		"/deop",
		"/devoice",
		"/disconnect",
		"/join",
		"/kick",
		"/leave",
		"/mode",
		"/nick",
		"/op",
		"/part",
		"/query",
		"/quit",
		"/server",
		"/topic",
		"/voice",
		"/whois",
	];
	
	var socket = io.connect("");
	$.each(["network", "channel", "user", "message"], function(i, event) {
		socket.on(event, function(json) {
			handleEvent(event, json);
		});
	});
	
	var tpl = [];
	function render(id, json) {
		tpl[id] = tpl[id] || Handlebars.compile($(id).html());
		return tpl[id](json);
	}
	
	function handleEvent(event, json) {
		var data = [].concat(json.data);
		switch (event) {
		
		case "network":
			var html = "";
			data.forEach(function(n) {
				html += render("#windows", {windows: n.channels});
			});
			chat[0].innerHTML = html;

			sidebar.html(
				render("#networks", {networks: data})
			).find(".channel")
				.first()
				.addClass("active")
				.end();

			chat.find(".messages")
				.scrollGlue({animate: 400})
				.scrollToBottom()
				.end();
			chat.find(".window")
				.find("input")
				.tabComplete({after: " ", list: commands})
				.inputHistory({submit: true})
				.end()
				.first()
				.bringToTop()
				.end();
			break;

		case "channel":
			var id = data[0].id;
			if (json.action == "remove") {
				$("#channel-" + id + ", #window-" + id).remove();
				var highest = 0;
				var next = null;
				$(".window").each(function() {
					var z = $(this).css("z-index");
					if (z == "auto") z = 0;
					if (z > highest) {
						highest = z;
						next = $(this);
					}
				});
				if (next != null) {
					$("#channel-" + next.attr("id").replace("window-", "")).addClass("active");
					next.bringToTop();
				}
				return;
			}

			sidebar.find(".channel").removeClass("active");
			
			$("#network-" + json.target).append(
				render("#channels", {channels: data})
			).find(".channel")
				.last()
				.addClass("active");

			chat.append(
				render("#windows", {windows: data})
			).find(".window")
				.last()
				.find("input")
				.tabComplete({after: " ", list: commands})
				.inputHistory({submit: true})
				.end()
				.bringToTop()
				.find(".messages")
				.scrollGlue({animate: 400})
				.end();
			break;

		case "user":
			var html = render("#users", {users: data});
			var target = chat.find("#window-" + json.target + " .users").html(html);
			break;

		case "message":
			var target = $("#window-" + json.target);
			if (target.size() == 0) {
				return;
			}
			
			if (data.type == "error") {
				target = target.parent().find(".active");
			}
			
			var msg = $(render("#messages", {messages: data}));
			
			target = target.find(".messages");
			target.append(msg);
			break;

		}
	}

	sidebar.on("click", ".channel", function(e) {
		e.preventDefault();
		sidebar.find(".active").removeClass("active");
		$("#viewport").removeClass();
		var item = $(this)
			.addClass("active")
			.find(".badge")
			.html("")
			.end();
		$("#window-" + item.attr("id").replace("channel-", ""))
			.bringToTop();
	});

	chat.on("submit", "form", function() {
		var input = $(this).find(".input");
		var text  = input.val();
		if (text == "") {
			return false;
		}
		input.val("");
		socket.emit("input", {
			id: input.data("target"),
			text: text,
		});
	});

	chat.on("dblclick", ".user", function() {
		var link = $(this);
		var id   = parseInt(link.closest(".window").attr("id").replace("window-", ""));
		var name = link.text().trim();
		if (name == "-!-" || name.indexOf(".") != -1) {
			return;
		}
		socket.emit("input", {
			id: id,
			text: "/whois " + link.text().trim(),
		});
	});

	chat.on("focus", "input[type=text]", function() {
		$(this).closest(".window").find(".messages").scrollToBottom();
	});

	var highest = 1;
	$.fn.bringToTop = function() {
		return this.css('z-index', highest++)
			.addClass("active")
			.find(".input")
			.focus()
			.end()
			.siblings()
			.removeClass("active")
			.end();
	};
	
	function uri(text) {
		return URI.withinString(text, function(url) {
			return "<a href='" + url + "' target='_blank'>" + url + "</a>";
		});
	}
	
	function escape(string) {
		var e = {
			"<": "&lt;",
			">": "&gt;",
		};
		return string.replace(/[<>]/g, function (s) {
			return e[s];
		});
	}
	
	Handlebars.registerHelper(
		"uri",
		function(text) {
			return uri(escape(text));
		}
	);
	
	Handlebars.registerHelper(
		"partial",
		function(id) {
			return new Handlebars.SafeString(render(id, this));
		}
	);
});
