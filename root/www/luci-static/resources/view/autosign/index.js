'use strict';
'require view';
'require form';
'require fs';
'require ui';
'require uci';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('autosign'),
			fs.read('/var/log/autosign.log').catch(function() { return ''; })
		]);
	},

	render: function(data) {
		var initial_log = data[1] || '暂无运行日志。可在下方点击【⚡ 立即执行签到测试】运行测试。';

		var m = new form.Map('autosign', _('定时自动签到'),
			_('超轻量级 OpenWrt 定时自动签到插件。支持每日定时调度、随机防风控延迟、多任务 HTTP/脚本混合配置以及微信/Telegram 推送。'));

		// ==================== 1. 基本与定时设置 ====================
		var s_gen = m.section(form.NamedSection, 'global', 'autosign', _('基本与全局设置'));
		s_gen.anonymous = true;
		s_gen.addremove = false;

		var o;

		o = s_gen.option(form.Flag, 'enabled', _('启用定时签到服务'), _('总开关：开启后，各签到任务将在各自设定的时间独立自动运行'));
		o.rmempty = false;

		// 默认 24 小时制小时选择
		o = s_gen.option(form.ListValue, 'default_run_hour', _('默认执行时间 (小时)'), _('新建任务时的默认小时 (每个任务可单独自定义时间)'));
		for (var h = 0; h < 24; h++) {
			var val = (h < 10 ? '0' : '') + h;
			o.value(val, val + ' 点 (' + (h < 12 ? '上午' : '下午/晚上') + ')');
		}
		o.default = '08';

		// 默认分钟选择
		o = s_gen.option(form.ListValue, 'default_run_minute', _('默认执行时间 (分钟)'), _('新建任务时的默认分钟'));
		for (var min = 0; min < 60; min++) {
			var val_min = (min < 10 ? '0' : '') + min;
			o.value(val_min, val_min + ' 分');
		}
		o.default = '30';

		o = s_gen.option(form.Value, 'random_delay', _('防封随机延迟 (秒)'), _('在指定签到时间到达后，随机休眠 0 ~ N 秒再执行，防止每天固定时间被检测。设为 0 表示立即执行'));
		o.datatype = 'range(0, 3600)';
		o.placeholder = '0';
		o.default = '0';

		o = s_gen.option(form.Value, 'retry_count', _('失败重试次数'), _('当网络波动或接口请求失败时的自动重试次数'));
		o.datatype = 'range(1, 10)';
		o.placeholder = '3';
		o.default = '3';

		o = s_gen.option(form.Value, 'retry_interval', _('重试间隔 (秒)'), _('每次重试之间的等待间隔时间'));
		o.datatype = 'range(1, 600)';
		o.placeholder = '60';
		o.default = '60';

		// ==================== 2. 签到任务管理 ====================
		var s_tasks = m.section(form.GridSection, 'task', _('签到任务管理'), _('支持配置多个不同的签到任务，每个任务均可独立设定不同的定时执行时间。HTTP 模式适合各类 API 接口签到，脚本模式适合复杂网页或外部打卡脚本。'));
		s_tasks.addremove = true;
		s_tasks.anonymous = true;
		s_tasks.sortable = true;

		o = s_tasks.option(form.Flag, 'enabled', _('启用'));
		o.rmempty = false;
		o.default = '1';
		o.editable = true;

		o = s_tasks.option(form.Value, 'name', _('任务名称'));
		o.rmempty = false;
		o.placeholder = '如：每日论坛打卡';

		o = s_tasks.option(form.DummyValue, '_schedule_time', _('定时时间'));
		o.textvalue = function(section_id) {
			var h = uci.get('autosign', section_id, 'run_hour');
			var min = uci.get('autosign', section_id, 'run_minute');
			if (!h) h = uci.get('autosign', 'global', 'default_run_hour') || '08';
			if (!min) min = uci.get('autosign', 'global', 'default_run_minute') || '30';
			return '每天 ' + h + ':' + min;
		};

		o = s_tasks.option(form.ListValue, 'type', _('任务类型'));
		o.value('http', _('HTTP(S) 请求'));
		o.value('script', _('自定义脚本/命令'));
		o.default = 'http';

		// 弹窗编辑详细配置 - 独立定时时间
		o = s_tasks.option(form.ListValue, 'run_hour', _('任务执行时间 (小时)'), _('请选择本任务每天执行签到的小时 (24小时制)'));
		for (var h = 0; h < 24; h++) {
			var val = (h < 10 ? '0' : '') + h;
			o.value(val, val + ' 点 (' + (h < 12 ? '上午' : '下午/晚上') + ')');
		}
		o.default = '08';
		o.modalonly = true;

		o = s_tasks.option(form.ListValue, 'run_minute', _('任务执行时间 (分钟)'), _('请选择本任务每天执行签到的分钟'));
		for (var min = 0; min < 60; min++) {
			var val_min = (min < 10 ? '0' : '') + min;
			o.value(val_min, val_min + ' 分');
		}
		o.default = '30';
		o.modalonly = true;


		// 弹窗编辑详细配置
		o = s_tasks.option(form.ListValue, 'method', _('请求方式'));
		o.value('GET', 'GET');
		o.value('POST', 'POST');
		o.value('PUT', 'PUT');
		o.default = 'POST';
		o.depends('type', 'http');
		o.modalonly = true;

		o = s_tasks.option(form.Value, 'url', _('接口 URL'));
		o.placeholder = 'https://example.com/api/checkin';
		o.depends('type', 'http');
		o.modalonly = true;

		o = s_tasks.option(form.TextValue, 'headers', _('自定义请求头 (Headers)'), _('每行一个 Header，例如：<br><code>User-Agent: Mozilla/5.0</code><br><code>Content-Type: application/json</code>'));
		o.placeholder = 'User-Agent: Mozilla/5.0';
		o.rows = 3;
		o.depends('type', 'http');
		o.modalonly = true;

		o = s_tasks.option(form.TextValue, 'cookie', _('Cookie 数据'), _('若接口需要登录鉴权，在此粘贴完整 Cookie 字符串'));
		o.placeholder = 'session=xxxx; token=yyyy';
		o.rows = 2;
		o.depends('type', 'http');
		o.modalonly = true;

		o = s_tasks.option(form.TextValue, 'data', _('POST/PUT 请求内容 (Body)'), _('JSON 报文或表单数据'));
		o.placeholder = '{"action":"sign"}';
		o.rows = 3;
		o.depends('type', 'http');
		o.modalonly = true;

		o = s_tasks.option(form.Value, 'match_keyword', _('成功判定关键词'), _('若返回内容中包含此文字则视为签到成功。留空则只依据 HTTP 200 状态码判定'));
		o.placeholder = '如: success 或 "code":0';
		o.depends('type', 'http');
		o.modalonly = true;

		o = s_tasks.option(form.Value, 'script_cmd', _('自定义脚本命令或路径'), _('填入可执行命令或脚本路径（如 <code>/etc/autosign/login.sh</code>），退出码为 0 代表执行成功'));
		o.placeholder = '/usr/bin/python3 /root/checkin.py 或 bash /etc/autosign/task.sh';
		o.depends('type', 'script');
		o.modalonly = true;

		// ==================== 3. 消息通知设置 ====================
		var s_notify = m.section(form.NamedSection, 'global', 'autosign', _('消息推送设置'));
		s_notify.anonymous = true;
		s_notify.addremove = false;

		o = s_notify.option(form.ListValue, 'notify_type', _('通知渠道'));
		o.value('none', _('关闭通知'));
		o.value('pushplus', _('PushPlus (微信消息推送)'));
		o.value('serverchan', _('Server酱·Turbo (微信/企业微信)'));
		o.value('telegram', _('Telegram 机器人'));
		o.value('bark', _('Bark (iOS 极速通知)'));
		o.value('webhook', _('自定义 Webhook (POST JSON)'));
		o.default = 'none';

		o = s_notify.option(form.Value, 'notify_token', _('Token / Key / URL'), _('填写所选通知渠道的 Token、SendKey 或 Webhook 完整 URL'));
		o.depends('notify_type', 'pushplus');
		o.depends('notify_type', 'serverchan');
		o.depends('notify_type', 'telegram');
		o.depends('notify_type', 'bark');
		o.depends('notify_type', 'webhook');

		o = s_notify.option(form.Value, 'notify_secret', _('Chat ID (Telegram 专用)'), _('接收消息的 Telegram 用户 ID 或群组 ID'));
		o.depends('notify_type', 'telegram');

		// ==================== 4. 运行日志与即时测试 ====================
		var s_log = m.section(form.NamedSection, 'global', 'autosign', _('运行日志与即时测试'));
		s_log.anonymous = true;
		s_log.addremove = false;

		var log_box = E('pre', {
			'id': 'autosign_log_view',
			'style': 'background:#181818;color:#00ff66;padding:12px 16px;border-radius:6px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.5;max-height:450px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;box-shadow:inset 0 0 10px rgba(0,0,0,0.5);'
		}, [ initial_log ]);

		var update_log_content = function() {
			return fs.read('/var/log/autosign.log').then(function(content) {
				log_box.textContent = content || '暂无运行记录。';
				log_box.scrollTop = log_box.scrollHeight;
			}).catch(function() {
				log_box.textContent = '暂无运行记录。';
			});
		};

		var btn_run_now = E('button', {
			'class': 'cbi-button cbi-button-action',
			'style': 'margin-right:10px;',
			'click': function(ev) {
				ev.preventDefault();
				ui.showModal(_('正在执行签到...'), [
					E('p', { 'class': 'spinning' }, _('正在运行签到任务引擎，请稍候...'))
				]);

				fs.exec('/usr/share/autosign/autosign.sh', ['run', 'force']).then(function(res) {
					ui.hideModal();
					update_log_content();
					ui.addNotification(null, E('p', _('签到任务执行完毕！请在日志窗口查看详细结果。')), 'info');
				}).catch(function(err) {
					ui.hideModal();
					ui.addNotification(null, E('p', _('执行出错: ') + (err.message || err)), 'error');
				});
			}
		}, [ '⚡ ' + _('立即测试全部任务') ]);

		var btn_refresh_log = E('button', {
			'class': 'cbi-button cbi-button-neutral',
			'style': 'margin-right:10px;',
			'click': function(ev) {
				ev.preventDefault();
				update_log_content();
			}
		}, [ '🔄 ' + _('刷新日志') ]);

		var btn_clear_log = E('button', {
			'class': 'cbi-button cbi-button-remove',
			'click': function(ev) {
				ev.preventDefault();
				fs.exec('/usr/share/autosign/autosign.sh', ['clearlog']).then(function() {
					update_log_content();
					ui.addNotification(null, E('p', _('日志已清空')), 'info');
				});
			}
		}, [ '🗑️ ' + _('清空日志') ]);

		var toolbar = E('div', { 'style': 'margin: 12px 0;' }, [
			btn_run_now,
			btn_refresh_log,
			btn_clear_log
		]);

		var custom_log_field = s_log.option(form.DummyValue, '_logview');
		custom_log_field.render = function() {
			return E('div', {}, [
				toolbar,
				log_box
			]);
		};

		// 监听配置保存应用事件，自动同步系统 Crontab
		document.addEventListener('uci-applied', function() {
			fs.exec('/etc/init.d/autosign', ['reload']);
		});

		return m.render();
	}
});
