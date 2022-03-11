## Guía para llamadas entre Contratos (Cross-Contract)

El protocolo NEAR permite la creación de transacciones en el código de un contrato. Esto, con el fin de considerar los casos de uso mas comunes, como por ejemplo llamar a un contrato desde otro, así como patrones mas avanzados, como usar un contrato como fábrica (Factory) para generar, o servir como Proxy para otros contratos. El mecanismo usado tiene muchos nombres que generan confusión al principio, hasta que uno se da cuenta que todo el mundo esta hablando de diferentes partes de un mismo elefante, solo que visto desde perspectivas diferentes. 

### Recibos

Todas las llamadas entre contratos (también conocidas como "xcc") utilizan las mismas estructuras de datos: `ActionReceipts` y `DataReceipts`.

- `ActionReceipts` representan una transacción *planificada, garantizada*, interna a la red NEAR, luego que la firma haya sido verificada. 
- `DataReceipts` representan el resultado de una transacción completada enrutada a algún destino. 

Puede leer más sobre estos conceptos en la [documentación técnica](https://nomicon.io/RuntimeSpec/Receipts.html).

### Niveles de Abstracción

Existen dos (2) niveles de abstracción en el SDK de NEAR para AssemblyScript y Rust. El nivel más alto es el recomendado para los novatos a la plataforma, ya que es más amigable para los desarrolladores. Los archivos incluidos en este módulo proveen ejemplos de cada uno de estos niveles, ofreciendo suficiente contexto (esperamos) que permita entender claramente como usarlos.

- **Alto Nivel**: \
  - API de llamadas de funciones simples (Function Call API) \
    Recomendada cuando se necesita realizar una llamada a una función, o varias llamadas a funciones entre contratos. Esta API es bastante similar entre sus versiones de AssemblyScript y Rust, con algunas diferencias menores. 
  - API de Acciones por Lote (Batch Actions API) \ 
    Recomendada cuando se aplica cualquier tipo de [`Action`]() en el código del contrato. 
    Esta API es bastante similar entre sus versiones de AssemblyScript y Rust, con algunas diferencias menores. 

- **Bajo Nivel**: \
  No recomendado para uso general, pero muy interesante para aprender sobre cómo los SDK de NEAR funcionan internamente, ya que revela el API de la máquina virtual de NEAR. 
  Esta API es muy similar entre sus versiones en AssemblyScript y Rust a la hora de programar contratos, ya que es una interfaz directa con la máquina virtual. 

### Archivos en éste Módulo

```
contracts
└── 00.orientation
    ├── README-ES.md                        <-- este archivo
    ├── simulation
    │   ├── Cargo.toml
    │   └── src
    │       ├── lib.rs                      <-- pruebas de simulación
    │       ├── local.rs                    <-- interfaz de contrato 00-local
    │       └── remote.rs                   <-- interfaz de contrato 00-remote
    └── src
        ├── 00-local
        │   ├── __tests__
        │   │   └── index.unit.spec.ts      <-- Pruebas unitarias para el contrato "00-local"
        │   ├── asconfig.json               <-- Ayudante de configuración para el compilador
        │   └── assembly
        │       └── index.ts                <-- contrato 00-local
        └── 00-remote
            ├── __tests__
            │   └── index.unit.spec.ts
            ├── asconfig.json
            └── assembly
                └── index.ts
```

### Preguntas clave

Existen algunas preguntas clave que generalmente surgen debido al contenido de este módulo, incluyendo: 

- Cuales son las ventajas y desventajas al usar una u otra capa de abstracción?
  - Hay una diferencia en el costo de almacenamiento, resultante de usar el API de alto nivel versus el API de bajo nivel. 
  - Hay una diferencia asociada al costo de gas usado (`burnt_gas`) para cada una de estas llamadas. 

- Cómo son las "Promises" reconciliadas en la blockchain? 
  - Las "Promises" en la plataforma NEAR son el nombre amigable, para los desarrolladores, de los recibos `ActionReceipt` y `DataReceipt`.
  - Las "Promises" se reconcilian en los límites de las funciones y hasta el momento no hay soporte para un mecanismo como `await` en el ámbito (scope) de una función en un contrato. 
  - El valor de retorno de una Promise estará disponible en un bloque futuro y hay exactamente dos maneras de capturar este valor: 
    1. Como el valor de retorno de la función exportada que eventualmente inició la llamada a la Promise, aunque indique que retorna `void`.
    2. Como los "resultados de la Promise", capturados por una función callback. 

## Conceptos clave de llamadas entre contratos

La posibilidad de llamar a un método de un contrato, desde otro contrato, es una funcionalidad invaluable en NEAR, debido a la manera en que están relacionadas las cuentas, contratos y pedazos (shards) en el protocolo NEAR. 

Cada cuenta en NEAR puede tener a lo sumo un contrato. Las cuentas de usuario generalmente no contienen un contrato mientras que las cuentas de DApps _si_ lo contienen. Algunas DApps hasta pueden requerir un sistema de contratos correlacionados que coordinan el trabajo de la DApp, en cuyo caso estos contratos estarán, probablemente, contenidos en subcuentas, un esquema válido de nombres para cuentas parecido a DNS. Por ejemplo, `dapp.near` puede ser el nivel de cuenta más alto, teniendo subcuentas como `module1.dapp.near`, `module2.dapp.near`, etc. para cada una de las partes correlacionadas de la DApp. 

Las cuentas "viven" en un único pedazo (shard) al cual califican de "hogar". Con esto queremos decir: todo su estado es almacenado en un único pedazo (shard), y todas las llamadas a un contrato en esa cuenta, son enrutadas en la red a los nodos que validan a ese pedazo (shard). Adicionalmente, el protocolo se reserva el derecho de redistribuir cuentas entre los pedazos (shards) lo cual beneficia a la red, ya que aisla cuentas con alta demanda (es decir, contratos) a un pedazo (shard) propio donde no afectan el ancho de banda de todos los otros pedazos (shards) en el sistema. Al día de escribir este contenido, NEAR MainNet (la red principal) tiene un solo pedazo (shard) pero el equipo de desarrollo NEAR Core y los Guilds en la comunidad trabajan arduamente y progresan a una red multi-pedazo (muti-shard).

Los desarrolladores que entiendan y vean las ventajas de usar este modelo para cuentas, reconoceran varios beneficios: 

- Cualquier contrato existente en la red (es decir, contratos core) pueden ser reutilizados en nuevas DApps mediante llamadas entre contratos. 
- DApps con "hot spots" (puntos con costo computacional elevado) en el código del contrato, pueden reorganizarse y separarse en múltples contratos, utilizando así las ventajas de llamadas entre contratos y mejorar el rendimiento. 
- DApps con lógica compleja pueden ser reorganizados en contratos más simples y pequeños, simplificando el mantenimiento e incrementando las oportunidades de reutilización de contratos.
- DApps con transacciones de larga duración, que son imposibles o impracticas de acomodar en un solo bloque, pueden ser reorganizadas en múltiples llamadas entre contratos. 
- DApps cuyo diseño se beneficia de realizar múltiples llamadas en paralelo pueden usar llamadas entre contratos para consolidar los resultados.

Sea por tener una ventaja al usar contratos existentes en la red, o creando por su cuenta un sistema de contratos interdependientes, el poder realizar llamadas entre contratos es una funcionalidad invaluable del protocolo NEAR y un diferenciador único de esta red de capa 1. 

## Llamadas a Funciones

El patrón mas común para realizar llamadas entre contratos, es llamando una función en un contrato desde otro contrato. Esta capacidad se logra mediante una interfaz dedicada para realizar este tipo de llamadas. 

Esta interfaz está implementada en dos niveles de abstracción: 
- Una interfaz estilo C de bajo nivel, que mapea al API de la máquina vritual de NEAR.
- Una interfaz ergonómica de alto nivel que provee soporte para tipos de AssemblyScript y Rust.

### Interfaz de Alto Nivel

La interfaz de alto nivel está diseñada para parecerse a la interfaz de Promise de JavaScript, y sirve de intermediaria a la interfaz de bajo nivel, utilizando tipos de AssemblyScript y Rust como parámetros. 

- `ContractPromise.create`: (método estático) utilizado para el patrón de uso más común, llamar un método de un contrato desde otro.
- `ContractPromise.all`: (método estático) permite consolidar los resultados de múltiples llamadas a métodos. 
- `ContractPromise.then`: permite encadenar múltiples llamadas a métodos (es decir, ejecuta uno luego que el otro complete su ejecución).

**cuando usar esta interfaz?**

Esta interfaz está recomendada para todas las llamadas entre contratos que invocan un contrato desde un método en otro contrato. Este escenario es el 80% de los casos. 

El valor de retorno de la llamada al método no será implicitamente capturada o estará disponible. 

Para capturar el valor de retorno de la llamada, el desarrollador debe explicitamente escoger una de las siguientes opciones:
- obtener luego de finalizar la llamada a la función actual. 
- utilizar un callback a otra función. 

**cómo usar esta interfaz?**



