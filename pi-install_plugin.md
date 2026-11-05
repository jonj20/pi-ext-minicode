```
# 联网与安全
#pi install npm:pi-web-access
#pi install npm:@wkqco33/pi-loop-guard

#安全
#pi install npm:@momenttttt/pi-read-guard
#pi install npm:@diegopetrucci/pi-permission-gate

# 代码智能与工具
#pi install npm:@mrclrchtr/supi-code-intelligence   # LSP/AST 查询与导航
#pi install npm:@watercol/pi-lens-simple

# 代理
#pi install npm:pi-open-agents

# 上下文治理
#pi install npm:@betterlmy/pi-auto-compact
# 轻量记忆（保留）
#pi install npm:@momenttttt/pi-zcode-memory

# 输出压缩
#pi install npm:pi-rtk-optimizer                    # 安装后务必执行 /rtk verify

# UI
#pi install npm:pi-footer
pi install npm:@taimoorchatha/pi-context-footer
#pi install npm:pi-minimal-footer

#免费模型
#pi install npm:pi-free
#pi install npm:pi-freerouter
pi install npm:pi-kilocode
#pi install npm:pi-our-free-model
#pi install npm:ck-pi-cline

#call pi install "npm:pi-windows-shell"

#本地模型自动检测
pi install ./pi-local-llm

```



# pack
cd ./pi-local-llm
npm pack
pi install ./pi-local-llm-0.0.1.tgz